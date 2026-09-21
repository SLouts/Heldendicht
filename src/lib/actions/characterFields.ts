"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { moveOrderedItem } from "@/lib/orderedList";

export type CharacterFieldFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const LabelSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入欄位名稱" })
  .max(30, { error: "欄位名稱最多 30 字" });

/**
 * 世界觀主辦/編輯自訂「角色必填欄位」模板——套用在這個世界觀底下所有
 * 角色節點(PC/NPC)的建立/編輯表單,玩家填角色資料時這些欄位都要填。
 * 「只有 staff 能管理」交給 world_character_fields_write RLS policy
 * 把關,這裡不重複檢查。
 */
export async function createCharacterField(
  _prevState: CharacterFieldFormState,
  formData: FormData,
): Promise<CharacterFieldFormState> {
  await requireUser();

  const worldId = formData.get("worldId");
  const worldSlug = formData.get("worldSlug");
  if (typeof worldId !== "string" || typeof worldSlug !== "string") {
    return { error: "缺少必要欄位" };
  }

  const parsed = LabelSchema.safeParse(formData.get("label") ?? "");
  if (!parsed.success) {
    return { fieldErrors: { label: [parsed.error.issues[0].message] } };
  }

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("world_character_fields")
    .select("order_index")
    .eq("world_id", worldId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("world_character_fields").insert({
    world_id: worldId,
    label: parsed.data,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "已經有一個同名的欄位了"
          : "新增失敗,請確認你是這個世界觀的主辦或編輯",
    };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/character-fields`);
  return undefined;
}

export async function updateCharacterField(
  _prevState: CharacterFieldFormState,
  formData: FormData,
): Promise<CharacterFieldFormState> {
  await requireUser();

  const fieldId = formData.get("fieldId");
  const worldSlug = formData.get("worldSlug");
  if (typeof fieldId !== "string" || typeof worldSlug !== "string") {
    return { error: "缺少必要欄位" };
  }

  const parsed = LabelSchema.safeParse(formData.get("label") ?? "");
  if (!parsed.success) {
    return { fieldErrors: { label: [parsed.error.issues[0].message] } };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("world_character_fields")
    .update({ label: parsed.data }, { count: "exact" })
    .eq("id", fieldId);
  if (error || count === 0) {
    return {
      error:
        error?.code === "23505"
          ? "已經有一個同名的欄位了"
          : "更新失敗,請確認你是這個世界觀的主辦或編輯",
    };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/character-fields`);
  return undefined;
}

export async function deleteCharacterField(
  fieldId: string,
  worldSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("world_character_fields")
    .delete({ count: "exact" })
    .eq("id", fieldId);
  if (error || count === 0) {
    throw new Error("刪除失敗,或你沒有權限");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/character-fields`);
}

/** 上移/下移一個欄位:跟相鄰的欄位互換 order_index。 */
export async function moveCharacterField(
  fieldId: string,
  worldId: string,
  worldSlug: string,
  direction: "up" | "down",
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await moveOrderedItem({
    supabase,
    table: "world_character_fields",
    itemId: fieldId,
    group: { column: "world_id", value: worldId },
    direction,
  });
  if (error) throw new Error(error);

  revalidatePath(`/dashboard/worlds/${worldSlug}/character-fields`);
}

export type SetFieldValuesResult = { error: string } | { ok: true };

/**
 * 批次寫入一個角色節點對世界觀必填欄位模板的填答。建立/編輯角色節點時
 * 都會呼叫這裡——「這是不是你能編輯的節點」交給 can_edit_node RLS 把關;
 * 「每個必填欄位是否都填了」在這裡用 zod 動態依照 fields 清單驗證,
 * 不能留空(因為每一筆 world_character_fields 就代表一個必填欄位,
 * 沒有另外做「選填」的旗標)。
 */
export async function setCharacterFieldValues(
  nodeId: string,
  worldSlug: string,
  fields: { id: string; label: string }[],
  values: Record<string, string>,
): Promise<SetFieldValuesResult> {
  await requireUser();

  const shape: Record<string, z.ZodString> = {};
  for (const f of fields) {
    shape[f.id] = z
      .string()
      .trim()
      .min(1, { error: `請填寫「${f.label}」` });
  }
  const parsed = z.object(shape).safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "還有必填欄位沒填" };
  }
  if (fields.length === 0) {
    return { ok: true };
  }

  const supabase = await createClient();
  const rows = fields.map((f) => ({
    node_id: nodeId,
    field_id: f.id,
    value: parsed.data[f.id],
  }));

  const { error } = await supabase
    .from("character_field_values")
    .upsert(rows, { onConflict: "node_id,field_id" });
  if (error) {
    return { error: "儲存角色欄位失敗,請確認你有這個節點的編輯權限" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  return { ok: true };
}
