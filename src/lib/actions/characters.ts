"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { setCharacterFieldValues } from "@/lib/actions/characterFields";
import { setCategoryFieldValues } from "@/lib/actions/categoryFields";
import { generateNodeSlug } from "@/lib/slug";

const CreateCharacterSchema = z.object({
  worldId: z.uuid(),
  worldSlug: z.string().min(1),
  title: z.string().min(1, { error: "請輸入角色名稱" }),
  content: z.string(),
  characterType: z.enum(["pc", "npc"]),
  categoryId: z.union([z.uuid(), z.literal("")]).optional(),
});

const MAX_SLUG_ATTEMPTS = 5;

export type CreateCharacterState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

/**
 * 範例:建立 PC/NPC 一律呼叫 create_character RPC(見 database/schema.sql),
 * 而不是分兩次呼叫 `.from("nodes").insert()` 再 `.from("characters").insert()`
 * —— 這樣配額 trigger 擋下時,不會留下沒有配對 characters 的孤兒節點。
 *
 * 這裡完全沒有自己判斷「是否超過配額」或「是否為世界觀成員」,
 * 這些全部交給資料庫的 RLS policy 與 enforce_pc_quota trigger 把關;
 * Server Action 只負責基本的表單格式驗證與呼叫 RPC,
 * 配額被擋下時直接把資料庫丟出的中文錯誤訊息顯示給使用者。
 */
export async function createCharacter(
  _prevState: CreateCharacterState,
  formData: FormData,
): Promise<CreateCharacterState> {
  const user = await requireUser();

  const parsed = CreateCharacterSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    characterType: formData.get("characterType"),
    categoryId: formData.get("categoryId") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { worldId, worldSlug, title, content, characterType, categoryId } = parsed.data;

  const supabase = await createClient();

  // 這個世界觀要求角色填的必填欄位——用當下資料庫的清單重新驗證,
  // 不信任表單自己夾帶的欄位 id/名稱,避免有人繞過瀏覽器端的 required
  // 屬性送出空值。在真的建立節點之前就先擋下,不要留下欄位沒填的角色。
  const { data: allCharacterFields } = await supabase
    .from("world_character_fields")
    .select("id, label, character_type, field_type, options, range_min, range_max")
    .eq("world_id", worldId)
    .order("order_index", { ascending: true });

  // 共用欄位(character_type 是 NULL)兩邊都要填,'pc'/'npc' 只在對應類型才要填。
  const characterFields = (allCharacterFields ?? []).filter(
    (f) => f.character_type === null || f.character_type === characterType,
  );

  const fieldValues: Record<string, string> = {};
  for (const f of characterFields) {
    const v = formData.get(`field_${f.id}`);
    if (typeof v !== "string" || v.trim() === "") {
      return { error: `請填寫「${f.label}」` };
    }
    fieldValues[f.id] = v;
  }

  // 分類欄位(world_category_fields)跟角色必填欄位是兩套獨立的模板,
  // 角色節點掛了分類一樣要遵守該分類的必填/選填規則——理由同上,一律
  // 用當下資料庫查到的欄位清單為準,不信任表單夾帶的欄位 id/是否必填。
  let categoryFields: {
    id: string;
    label: string;
    is_required: boolean;
    field_type: "text" | "select" | "range";
    options: string[];
    range_min: number | null;
    range_max: number | null;
  }[] = [];
  if (categoryId) {
    const { data: fields } = await supabase
      .from("world_category_fields")
      .select("id, label, is_required, field_type, options, range_min, range_max")
      .eq("category_id", categoryId)
      .order("order_index", { ascending: true });
    categoryFields = fields ?? [];
  }
  const categoryFieldValues: Record<string, string> = {};
  for (const f of categoryFields) {
    const v = formData.get(`field_${f.id}`);
    const value = typeof v === "string" ? v : "";
    if (f.is_required && value.trim() === "") {
      return { error: `請填寫「${f.label}」` };
    }
    categoryFieldValues[f.id] = value;
  }

  // slug 不讓使用者自己填(理由跟 lib/actions/nodes.ts 的 createNode 一樣),
  // 自動產生,撞號時重試幾次即可。
  let nodeId: string | null = null;
  let slug = "";
  let error: { message: string; code?: string } | null = null;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    slug = generateNodeSlug(title);
    const result = await supabase.rpc("create_character", {
      p_world_id: worldId,
      p_title: title,
      p_slug: slug,
      p_content: content,
      p_character_type: characterType,
      p_owner_id: characterType === "pc" ? user.id : null,
    });
    nodeId = result.data;
    error = result.error;
    if (!error || error.code !== "23505") break;
  }

  if (error) {
    // 配額 / 權限被資料庫擋下時,error.message 就是 trigger 丟出的那句中文提示
    return { error: error.code === "23505" ? "建立失敗,請稍後再試" : error.message };
  }

  if (characterFields.length > 0 && nodeId) {
    await setCharacterFieldValues(
      nodeId,
      worldSlug,
      characterFields.map((f) => ({
        id: f.id,
        label: f.label,
        fieldType: f.field_type,
        options: f.options,
        rangeMin: f.range_min,
        rangeMax: f.range_max,
      })),
      fieldValues,
    );
  }

  // create_character RPC 沒有 category_id 參數,所以用一次額外的 update 補上——
  // 跟填必填欄位一樣,分類是否開放投稿由 guard_node_category trigger 把關,
  // 不在這裡重複判斷。
  if (categoryId && nodeId) {
    const { error: categoryError } = await supabase
      .from("nodes")
      .update({ category_id: categoryId })
      .eq("id", nodeId);
    if (categoryError) {
      return { error: categoryError.message };
    }
    if (categoryFields.length > 0) {
      await setCategoryFieldValues(
        nodeId,
        worldSlug,
        categoryFields.map((f) => ({
          id: f.id,
          label: f.label,
          isRequired: f.is_required,
          fieldType: f.field_type,
          options: f.options,
          rangeMin: f.range_min,
          rangeMax: f.range_max,
        })),
        categoryFieldValues,
      );
    }
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  redirect(`/dashboard/worlds/${worldSlug}/nodes/${slug}`);
}
