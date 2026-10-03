"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { moveOrderedItem } from "@/lib/orderedList";

export type FeatureCardFormState =
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
  .max(2000, { error: "說明內容最多 2000 字" });

const ADMIN_HOMEPAGE_PATH = "/dashboard/admin/homepage";

/**
 * 首頁「平台特色」卡片(site_feature_cards)——數量不固定,站務可以自己
 * 新增/刪除/排序,內容可能是介紹平台功能、公告網站更新、或推廣某個
 * 世界觀(直接在內容裡用 MarkdownText 的 [文字](網址) 語法插連結)。
 * 「只有 site_admin 能管理」交給 site_feature_cards_write RLS policy
 * 把關,這裡不重複檢查——跟 siteRuleFields.ts 幾乎一樣的形狀,差在這裡
 * 標題不要求唯一(見 migration 040 的說明)。
 */
export async function createSiteFeatureCard(
  _prevState: FeatureCardFormState,
  formData: FormData,
): Promise<FeatureCardFormState> {
  await requireUser();

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
    .from("site_feature_cards")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("site_feature_cards").insert({
    label: label.data,
    content: content.data,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return { error: "新增失敗,請確認你是站方管理員" };
  }

  revalidatePath(ADMIN_HOMEPAGE_PATH);
  revalidatePath("/");
  return undefined;
}

export async function updateSiteFeatureCard(
  _prevState: FeatureCardFormState,
  formData: FormData,
): Promise<FeatureCardFormState> {
  await requireUser();

  const fieldId = formData.get("fieldId");
  if (typeof fieldId !== "string") {
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
    .from("site_feature_cards")
    .update({ label: label.data, content: content.data }, { count: "exact" })
    .eq("id", fieldId);
  if (error || count === 0) {
    return { error: "更新失敗,請確認你是站方管理員" };
  }

  revalidatePath(ADMIN_HOMEPAGE_PATH);
  revalidatePath("/");
  return undefined;
}

export async function deleteSiteFeatureCard(fieldId: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("site_feature_cards")
    .delete({ count: "exact" })
    .eq("id", fieldId);
  if (error || count === 0) {
    throw new Error("刪除失敗,或你沒有權限");
  }

  revalidatePath(ADMIN_HOMEPAGE_PATH);
  revalidatePath("/");
}

/** 上移/下移一張卡片:跟相鄰的卡片互換 order_index。 */
export async function moveSiteFeatureCard(
  fieldId: string,
  direction: "up" | "down",
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await moveOrderedItem({
    supabase,
    table: "site_feature_cards",
    itemId: fieldId,
    direction,
  });
  if (error) throw new Error(error);

  revalidatePath(ADMIN_HOMEPAGE_PATH);
  revalidatePath("/");
}
