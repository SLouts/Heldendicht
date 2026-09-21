"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { generateNodeSlug } from "@/lib/slug";
import { parseCharacterImportText } from "@/lib/textImport";

export type ImportCharacterState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const ImportCharacterSchema = z.object({
  worldId: z.uuid(),
  worldSlug: z.string().min(1),
  title: z.string().min(1, { error: "請輸入角色名稱" }),
  characterType: z.enum(["pc", "npc"]),
  categoryId: z.union([z.uuid(), z.literal("")]).optional(),
  rawText: z.string().min(1, { error: "請貼上要匯入的文字" }),
});

const MAX_SLUG_ATTEMPTS = 5;

/**
 * 「貼上文字自動匯入」——跟 createCharacter 一樣呼叫 create_character RPC
 * 建立節點+characters(配額/權限交給 trigger/RLS 把關,這裡不重複判斷),
 * 差別是內文/欄位值/補充區塊/時間線都是從貼上的文字用 parseCharacterImportText
 * 這個純規則函式解析出來,不叫任何 AI。
 *
 * 角色欄位值刻意不要求「全部欄位都要偵測到值」——跟 setCharacterFieldValues
 * (手動表單那條路)不同,這裡只要貼的文字裡對到了幾個算幾個,沒偵測到的
 * 欄位讓使用者匯入後自己去角色頁面補,不因為漏了一個欄位就擋下整次匯入
 * (畢竟匯入的重點是把既有大段文字省力搬進來,不是重新走一次嚴格驗證)。
 */
export async function importCharacterFromText(
  _prevState: ImportCharacterState,
  formData: FormData,
): Promise<ImportCharacterState> {
  const user = await requireUser();

  const parsed = ImportCharacterSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    title: formData.get("title"),
    characterType: formData.get("characterType"),
    categoryId: formData.get("categoryId") ?? "",
    rawText: formData.get("rawText") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { worldId, worldSlug, title, characterType, categoryId, rawText } = parsed.data;

  const supabase = await createClient();

  const [{ data: characterFields }, { data: sectionTemplates }] = await Promise.all([
    supabase
      .from("world_character_fields")
      .select("id, label")
      .eq("world_id", worldId)
      .order("order_index", { ascending: true }),
    supabase
      .from("world_section_templates")
      .select("label")
      .eq("world_id", worldId)
      .order("order_index", { ascending: true }),
  ]);

  const result = parseCharacterImportText(
    rawText,
    (characterFields ?? []).map((f) => f.label),
    (sectionTemplates ?? []).map((t) => t.label),
  );

  let nodeId: string | null = null;
  let slug = "";
  let error: { message: string; code?: string } | null = null;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    slug = generateNodeSlug(title);
    const rpcResult = await supabase.rpc("create_character", {
      p_world_id: worldId,
      p_title: title,
      p_slug: slug,
      p_content: result.mainContent,
      p_character_type: characterType,
      p_owner_id: characterType === "pc" ? user.id : null,
    });
    nodeId = rpcResult.data;
    error = rpcResult.error;
    if (!error || error.code !== "23505") break;
  }

  if (error) {
    return { error: error.code === "23505" ? "建立失敗,請稍後再試" : error.message };
  }
  if (!nodeId) {
    return { error: "建立失敗,請稍後再試" };
  }

  if (categoryId) {
    const { error: categoryError } = await supabase
      .from("nodes")
      .update({ category_id: categoryId })
      .eq("id", nodeId);
    if (categoryError) {
      return { error: categoryError.message };
    }
  }

  if (result.fieldValues.length > 0 && characterFields) {
    const labelToId = new Map(characterFields.map((f) => [f.label, f.id]));
    const rows = result.fieldValues
      .map((fv) => ({ node_id: nodeId, field_id: labelToId.get(fv.label), value: fv.value }))
      .filter((row): row is { node_id: string; field_id: string; value: string } =>
        Boolean(row.field_id),
      );
    if (rows.length > 0) {
      await supabase.from("character_field_values").upsert(rows, { onConflict: "node_id,field_id" });
    }
  }

  if (result.sections.length > 0) {
    await supabase.from("node_sections").insert(
      result.sections.map((s, i) => ({
        node_id: nodeId,
        title: s.title,
        content: s.content,
        order_index: i,
      })),
    );
  }

  if (result.timelineEvents.length > 0) {
    await supabase.from("character_timeline_events").insert(
      result.timelineEvents.map((t, i) => ({
        node_id: nodeId,
        label: t.label,
        description: t.description,
        order_index: i,
      })),
    );
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  redirect(`/dashboard/worlds/${worldSlug}/nodes/${slug}`);
}
