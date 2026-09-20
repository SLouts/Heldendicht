"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

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

const ADMIN_RULES_PATH = "/dashboard/admin/rules";

/**
 * 站方(site_admin)自訂的全站規則欄位——投稿/使用這個網站要遵守的
 * 規定、授權或權利聲明,任何人都看得到。「只有 site_admin 能管理」
 * 交給 site_rule_fields_write RLS policy 把關,這裡不重複檢查。
 */
export async function createSiteRuleField(
  _prevState: RuleFieldFormState,
  formData: FormData,
): Promise<RuleFieldFormState> {
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
    .from("site_rule_fields")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("site_rule_fields").insert({
    label: label.data,
    content: content.data,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "已經有一個同標題的規則了"
          : "新增失敗,請確認你是站方管理員",
    };
  }

  revalidatePath(ADMIN_RULES_PATH);
  return undefined;
}

export async function updateSiteRuleField(
  _prevState: RuleFieldFormState,
  formData: FormData,
): Promise<RuleFieldFormState> {
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
    .from("site_rule_fields")
    .update({ label: label.data, content: content.data }, { count: "exact" })
    .eq("id", fieldId);
  if (error || count === 0) {
    return {
      error:
        error?.code === "23505"
          ? "已經有一個同標題的規則了"
          : "更新失敗,請確認你是站方管理員",
    };
  }

  revalidatePath(ADMIN_RULES_PATH);
  return undefined;
}

export async function deleteSiteRuleField(fieldId: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("site_rule_fields")
    .delete({ count: "exact" })
    .eq("id", fieldId);
  if (error || count === 0) {
    throw new Error("刪除失敗,或你沒有權限");
  }

  revalidatePath(ADMIN_RULES_PATH);
}

/** 上移/下移一則規則:跟相鄰的規則互換 order_index。 */
export async function moveSiteRuleField(
  fieldId: string,
  direction: "up" | "down",
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { data: fields } = await supabase
    .from("site_rule_fields")
    .select("id, order_index")
    .order("order_index", { ascending: true });
  if (!fields) return;

  const idx = fields.findIndex((f) => f.id === fieldId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= fields.length) return;

  const current = fields[idx];
  const sibling = fields[swapIdx];

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase
      .from("site_rule_fields")
      .update({ order_index: sibling.order_index })
      .eq("id", current.id),
    supabase
      .from("site_rule_fields")
      .update({ order_index: current.order_index })
      .eq("id", sibling.id),
  ]);
  if (e1 || e2) {
    throw new Error("排序失敗,請稍後再試");
  }

  revalidatePath(ADMIN_RULES_PATH);
}
