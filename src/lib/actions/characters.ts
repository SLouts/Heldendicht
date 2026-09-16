"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { setCharacterFieldValues } from "@/lib/actions/characterFields";

const CreateCharacterSchema = z.object({
  worldId: z.uuid(),
  worldSlug: z.string().min(1),
  title: z.string().min(1, { error: "請輸入角色名稱" }),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, { error: "slug 只能用小寫英數字與連字號" }),
  content: z.string(),
  characterType: z.enum(["pc", "npc"]),
  categoryId: z.union([z.uuid(), z.literal("")]).optional(),
});

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
    slug: formData.get("slug"),
    content: formData.get("content") ?? "",
    characterType: formData.get("characterType"),
    categoryId: formData.get("categoryId") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { worldId, worldSlug, title, slug, content, characterType, categoryId } =
    parsed.data;

  const supabase = await createClient();

  // 這個世界觀要求角色填的必填欄位——用當下資料庫的清單重新驗證,
  // 不信任表單自己夾帶的欄位 id/名稱,避免有人繞過瀏覽器端的 required
  // 屬性送出空值。在真的建立節點之前就先擋下,不要留下欄位沒填的角色。
  const { data: characterFields } = await supabase
    .from("world_character_fields")
    .select("id, label")
    .eq("world_id", worldId)
    .order("order_index", { ascending: true });

  const fieldValues: Record<string, string> = {};
  for (const f of characterFields ?? []) {
    const v = formData.get(`field_${f.id}`);
    if (typeof v !== "string" || v.trim() === "") {
      return { error: `請填寫「${f.label}」` };
    }
    fieldValues[f.id] = v;
  }

  const { data: nodeId, error } = await supabase.rpc("create_character", {
    p_world_id: worldId,
    p_title: title,
    p_slug: slug,
    p_content: content,
    p_character_type: characterType,
    p_owner_id: characterType === "pc" ? user.id : null,
  });

  if (error) {
    // 配額 / 權限被資料庫擋下時,error.message 就是 trigger 丟出的那句中文提示
    return { error: error.message };
  }

  if (characterFields && characterFields.length > 0 && nodeId) {
    await setCharacterFieldValues(nodeId, worldSlug, characterFields, fieldValues);
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
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  redirect(`/dashboard/worlds/${worldSlug}/nodes/${slug}`);
}
