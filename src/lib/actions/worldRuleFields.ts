"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { moveOrderedItem } from "@/lib/orderedList";

export type RuleFieldFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const LabelSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入標題" })
  .max(60, { error: "標題最多 60 字" });

const ContentSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入說明內容" })
  .max(4000, { error: "說明內容最多 4000 字" });

/**
 * 世界觀主辦/編輯自訂的「世界觀規則欄位」——投稿或使用這個世界觀要
 * 遵守的規定、授權或權利聲明,不是世界觀本身的介紹內容。「只有 staff
 * 能管理」交給 world_rule_fields_write RLS policy 把關,這裡不重複
 * 檢查。
 */
export async function createWorldRuleField(
  _prevState: RuleFieldFormState,
  formData: FormData,
): Promise<RuleFieldFormState> {
  await requireUser();

  const worldId = formData.get("worldId");
  const worldSlug = formData.get("worldSlug");
  if (typeof worldId !== "string" || typeof worldSlug !== "string") {
    return { error: "缺少必要欄位" };
  }

  const label = LabelSchema.safeParse(formData.get("label") ?? "");
  const content = ContentSchema.safeParse(formData.get("content") ?? "");
  if (!label.success || !content.success) {
    return {
      fieldErrors: {
        ...(label.success ? {} : { label: [label.error.issues[0].message] }),
        ...(content.success ? {} : { content: [content.error.issues[0].message] }),
      },
    };
  }

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("world_rule_fields")
    .select("order_index")
    .eq("world_id", worldId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("world_rule_fields").insert({
    world_id: worldId,
    label: label.data,
    content: content.data,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "已經有一個同標題的規則了"
          : "新增失敗,請確認你是這個世界觀的主辦或編輯",
    };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/rules`);
  return undefined;
}

export async function updateWorldRuleField(
  _prevState: RuleFieldFormState,
  formData: FormData,
): Promise<RuleFieldFormState> {
  await requireUser();

  const fieldId = formData.get("fieldId");
  const worldSlug = formData.get("worldSlug");
  if (typeof fieldId !== "string" || typeof worldSlug !== "string") {
    return { error: "缺少必要欄位" };
  }

  const label = LabelSchema.safeParse(formData.get("label") ?? "");
  const content = ContentSchema.safeParse(formData.get("content") ?? "");
  if (!label.success || !content.success) {
    return {
      fieldErrors: {
        ...(label.success ? {} : { label: [label.error.issues[0].message] }),
        ...(content.success ? {} : { content: [content.error.issues[0].message] }),
      },
    };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("world_rule_fields")
    .update({ label: label.data, content: content.data }, { count: "exact" })
    .eq("id", fieldId);
  if (error || count === 0) {
    return {
      error:
        error?.code === "23505"
          ? "已經有一個同標題的規則了"
          : "更新失敗,請確認你是這個世界觀的主辦或編輯",
    };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/rules`);
  return undefined;
}

export async function deleteWorldRuleField(
  worldSlug: string,
  fieldId: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("world_rule_fields")
    .delete({ count: "exact" })
    .eq("id", fieldId);
  if (error || count === 0) {
    throw new Error("刪除失敗,或你沒有權限");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/rules`);
}

/**
 * 上移/下移一則規則:跟相鄰的規則互換 order_index。worldId/worldSlug
 * 放在前面兩個參數,是為了讓呼叫端(Server Component)可以用
 * `.bind(null, worldId, worldSlug)` 綁好世界觀context 再把結果當成
 * Server Action 傳給共用的 OrderedContentEditor——.bind() 只能從左邊
 * 固定參數,所以會被呼叫端提供的參數(fieldId/direction)要放在最後面。
 */
export async function moveWorldRuleField(
  worldId: string,
  worldSlug: string,
  fieldId: string,
  direction: "up" | "down",
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await moveOrderedItem({
    supabase,
    table: "world_rule_fields",
    itemId: fieldId,
    group: { column: "world_id", value: worldId },
    direction,
  });
  if (error) throw new Error(error);

  revalidatePath(`/dashboard/worlds/${worldSlug}/rules`);
}
