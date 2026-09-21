"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { moveOrderedItem } from "@/lib/orderedList";

export type SectionFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const SectionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "請輸入標題" })
    .max(50, { error: "標題最多 50 字" }),
  content: z.string().trim().max(5000, { error: "內容最多 5000 字" }),
});

/**
 * 節點內文的補充區塊(外表/技能/個人主線之類,可收合展示)。
 * 「能不能新增/編輯/刪除」完全交給 node_sections 的 RLS policy
 * (can_edit_node),這裡不重複檢查權限。
 */
export async function createNodeSection(
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireUser();

  const nodeId = formData.get("nodeId");
  const worldSlug = formData.get("worldSlug");
  const nodeSlug = formData.get("nodeSlug");
  if (
    typeof nodeId !== "string" ||
    typeof worldSlug !== "string" ||
    typeof nodeSlug !== "string"
  ) {
    return { error: "缺少必要欄位" };
  }

  const parsed = SectionSchema.safeParse({
    title: formData.get("title") ?? "",
    content: formData.get("content") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("node_sections")
    .select("order_index")
    .eq("node_id", nodeId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("node_sections").insert({
    node_id: nodeId,
    title: parsed.data.title,
    content: parsed.data.content,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return { error: "新增失敗,請確認你有這個節點的編輯權限" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  return undefined;
}

export async function updateNodeSection(
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireUser();

  const sectionId = formData.get("sectionId");
  const worldSlug = formData.get("worldSlug");
  const nodeSlug = formData.get("nodeSlug");
  if (
    typeof sectionId !== "string" ||
    typeof worldSlug !== "string" ||
    typeof nodeSlug !== "string"
  ) {
    return { error: "缺少必要欄位" };
  }

  const parsed = SectionSchema.safeParse({
    title: formData.get("title") ?? "",
    content: formData.get("content") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("node_sections")
    .update(
      { title: parsed.data.title, content: parsed.data.content },
      { count: "exact" },
    )
    .eq("id", sectionId);
  if (error || count === 0) {
    return { error: "更新失敗,請確認你有這個節點的編輯權限" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  return undefined;
}

export async function deleteNodeSection(
  sectionId: string,
  worldSlug: string,
  nodeSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("node_sections")
    .delete({ count: "exact" })
    .eq("id", sectionId);
  if (error || count === 0) {
    throw new Error("刪除失敗,或你沒有權限");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
}

/** 上移/下移一個區塊:跟相鄰的區塊互換 order_index。 */
export async function moveNodeSection(
  sectionId: string,
  nodeId: string,
  worldSlug: string,
  nodeSlug: string,
  direction: "up" | "down",
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await moveOrderedItem({
    supabase,
    table: "node_sections",
    itemId: sectionId,
    group: { column: "node_id", value: nodeId },
    direction,
  });
  if (error) throw new Error(error);

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
}
