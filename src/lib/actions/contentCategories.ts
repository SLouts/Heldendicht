"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { moveOrderedItem } from "@/lib/orderedList";

export type ContentCategoryFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const NameSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入分類名稱" })
  .max(40, { error: "分類名稱最多 40 字" });

const DescriptionSchema = z
  .string()
  .trim()
  .max(300, { error: "簡介最多 300 字" })
  .optional();

/** 空字串代表「不歸類任何大分類」(頂層),不是驗證失敗。 */
const ParentIdSchema = z
  .union([z.uuid(), z.literal("")])
  .transform((v) => (v === "" ? null : v));

async function requireWorldStaff(worldId: string) {
  const supabase = await createClient();
  const { data: isStaff } = await supabase.rpc("is_world_staff", {
    p_world_id: worldId,
  });
  return { supabase, isStaff: Boolean(isStaff) };
}

/**
 * 建立世界觀的自訂「內容分類」(例如「修仙誌‧宗門」),用來在首頁做導覽
 * 分組。跟世界觀主辦/編輯自訂角色必填欄位一樣是 staff 等級的設定,不需要
 * 到 admin 那麼嚴格。
 */
export async function createContentCategory(
  _prevState: ContentCategoryFormState,
  formData: FormData,
): Promise<ContentCategoryFormState> {
  await requireUser();
  const worldId = formData.get("worldId");
  const worldSlug = formData.get("worldSlug");
  if (typeof worldId !== "string" || typeof worldSlug !== "string") {
    return { error: "缺少必要欄位" };
  }
  const nameParsed = NameSchema.safeParse(formData.get("name") ?? "");
  if (!nameParsed.success) {
    return { fieldErrors: { name: [nameParsed.error.issues[0].message] } };
  }
  const descriptionParsed = DescriptionSchema.safeParse(
    formData.get("description") || undefined,
  );
  if (!descriptionParsed.success) {
    return {
      fieldErrors: { description: [descriptionParsed.error.issues[0].message] },
    };
  }
  const acceptsSubmissions = formData.get("acceptsSubmissions") === "on";
  const parentIdParsed = ParentIdSchema.safeParse(formData.get("parentId") ?? "");
  if (!parentIdParsed.success) {
    return { error: "選擇的大分類無效" };
  }
  const parentId = parentIdParsed.data;

  const { supabase, isStaff } = await requireWorldStaff(worldId);
  if (!isStaff) {
    return { error: "只有這個世界觀的主辦/編輯可以新增分類" };
  }

  // 排序只在「同一組」裡有意義——沒有大分類的分類彼此排序,某個大分類
  // 底下的子分類彼此另外排序,兩組不會混在一起比較 order_index。
  let lastQuery = supabase
    .from("world_content_categories")
    .select("order_index")
    .eq("world_id", worldId);
  lastQuery = parentId ? lastQuery.eq("parent_id", parentId) : lastQuery.is("parent_id", null);
  const { data: last } = await lastQuery
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("world_content_categories").insert({
    world_id: worldId,
    name: nameParsed.data,
    description: descriptionParsed.data || null,
    accepts_submissions: acceptsSubmissions,
    parent_id: parentId,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "已經有一個同名的分類了" : error.message,
    };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories`);
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}`);
  return undefined;
}

export async function updateContentCategory(
  _prevState: ContentCategoryFormState,
  formData: FormData,
): Promise<ContentCategoryFormState> {
  await requireUser();
  const categoryId = formData.get("categoryId");
  const worldId = formData.get("worldId");
  const worldSlug = formData.get("worldSlug");
  if (
    typeof categoryId !== "string" ||
    typeof worldId !== "string" ||
    typeof worldSlug !== "string"
  ) {
    return { error: "缺少必要欄位" };
  }
  const nameParsed = NameSchema.safeParse(formData.get("name") ?? "");
  if (!nameParsed.success) {
    return { fieldErrors: { name: [nameParsed.error.issues[0].message] } };
  }
  const descriptionParsed = DescriptionSchema.safeParse(
    formData.get("description") || undefined,
  );
  if (!descriptionParsed.success) {
    return {
      fieldErrors: { description: [descriptionParsed.error.issues[0].message] },
    };
  }
  const acceptsSubmissions = formData.get("acceptsSubmissions") === "on";
  const parentIdParsed = ParentIdSchema.safeParse(formData.get("parentId") ?? "");
  if (!parentIdParsed.success) {
    return { error: "選擇的大分類無效" };
  }

  const { supabase, isStaff } = await requireWorldStaff(worldId);
  if (!isStaff) {
    return { error: "只有這個世界觀的主辦/編輯可以編輯分類" };
  }

  const { error } = await supabase
    .from("world_content_categories")
    .update({
      name: nameParsed.data,
      description: descriptionParsed.data || null,
      accepts_submissions: acceptsSubmissions,
      parent_id: parentIdParsed.data,
    })
    .eq("id", categoryId);
  if (error) {
    return {
      error: error.code === "23505" ? "已經有一個同名的分類了" : error.message,
    };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories`);
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}`);
  return undefined;
}

/**
 * 刪除分類——底下的節點不會被刪除,只是 category_id 變回 NULL(見 schema
 * 的 on delete set null);如果這個分類本身是別的分類的大分類,底下的
 * 子分類也不會被刪除,只是變回沒有大分類的頂層分類。
 */
export async function deleteContentCategory(
  categoryId: string,
  worldId: string,
  worldSlug: string,
): Promise<void> {
  const { supabase, isStaff } = await requireWorldStaff(worldId);
  if (!isStaff) {
    throw new Error("只有這個世界觀的主辦/編輯可以刪除分類");
  }

  const { error } = await supabase
    .from("world_content_categories")
    .delete()
    .eq("id", categoryId);
  if (error) {
    throw new Error("刪除失敗,請稍後再試");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories`);
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}`);
}

/**
 * 分類排序:跟「同一組」的上/下一個分類交換 order_index——沒有大分類的
 * 分類彼此排序,某個大分類底下的子分類則只跟同一個大分類底下的其他子
 * 分類排序,兩組不會混在一起。
 */
export async function moveContentCategory(
  categoryId: string,
  worldId: string,
  worldSlug: string,
  parentId: string | null,
  direction: "up" | "down",
): Promise<void> {
  const { supabase, isStaff } = await requireWorldStaff(worldId);
  if (!isStaff) {
    throw new Error("只有這個世界觀的主辦/編輯可以調整分類順序");
  }

  const { error } = await moveOrderedItem({
    supabase,
    table: "world_content_categories",
    itemId: categoryId,
    group: [
      { column: "world_id", value: worldId },
      { column: "parent_id", value: parentId },
    ],
    direction,
  });
  if (error) throw new Error(error);

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories`);
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}`);
}
