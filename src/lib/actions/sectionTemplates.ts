"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type SectionTemplateFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const LabelSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入區塊標題" })
  .max(30, { error: "區塊標題最多 30 字" });

/**
 * 世界觀主辦/編輯自訂「補充區塊範本」——跟 world_character_fields 同一套
 * 「模板」型態表格,只是這裡列的是 node_sections 的標題清單,給「貼上
 * 文字自動匯入」功能辨認用。「只有 staff 能管理」交給
 * world_section_templates_write RLS policy 把關,這裡不重複檢查。
 */
export async function createSectionTemplate(
  _prevState: SectionTemplateFormState,
  formData: FormData,
): Promise<SectionTemplateFormState> {
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
    .from("world_section_templates")
    .select("order_index")
    .eq("world_id", worldId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("world_section_templates").insert({
    world_id: worldId,
    label: parsed.data,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "已經有一個同名的區塊範本了"
          : "新增失敗,請確認你是這個世界觀的主辦或編輯",
    };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/section-templates`);
  return undefined;
}

export async function updateSectionTemplate(
  _prevState: SectionTemplateFormState,
  formData: FormData,
): Promise<SectionTemplateFormState> {
  await requireUser();

  const templateId = formData.get("templateId");
  const worldSlug = formData.get("worldSlug");
  if (typeof templateId !== "string" || typeof worldSlug !== "string") {
    return { error: "缺少必要欄位" };
  }

  const parsed = LabelSchema.safeParse(formData.get("label") ?? "");
  if (!parsed.success) {
    return { fieldErrors: { label: [parsed.error.issues[0].message] } };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("world_section_templates")
    .update({ label: parsed.data }, { count: "exact" })
    .eq("id", templateId);
  if (error || count === 0) {
    return {
      error:
        error?.code === "23505"
          ? "已經有一個同名的區塊範本了"
          : "更新失敗,請確認你是這個世界觀的主辦或編輯",
    };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/section-templates`);
  return undefined;
}

export async function deleteSectionTemplate(
  templateId: string,
  worldSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("world_section_templates")
    .delete({ count: "exact" })
    .eq("id", templateId);
  if (error || count === 0) {
    throw new Error("刪除失敗,或你沒有權限");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/section-templates`);
}

/** 上移/下移一個範本:跟相鄰的範本互換 order_index。 */
export async function moveSectionTemplate(
  templateId: string,
  worldId: string,
  worldSlug: string,
  direction: "up" | "down",
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("world_section_templates")
    .select("id, order_index")
    .eq("world_id", worldId)
    .order("order_index", { ascending: true });
  if (!templates) return;

  const idx = templates.findIndex((t) => t.id === templateId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= templates.length) return;

  const current = templates[idx];
  const sibling = templates[swapIdx];

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase
      .from("world_section_templates")
      .update({ order_index: sibling.order_index })
      .eq("id", current.id),
    supabase
      .from("world_section_templates")
      .update({ order_index: current.order_index })
      .eq("id", sibling.id),
  ]);
  if (e1 || e2) {
    throw new Error("排序失敗,請稍後再試");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/section-templates`);
}
