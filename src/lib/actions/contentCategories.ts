"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

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

  const { supabase, isStaff } = await requireWorldStaff(worldId);
  if (!isStaff) {
    return { error: "只有這個世界觀的主辦/編輯可以新增分類" };
  }

  const { data: last } = await supabase
    .from("world_content_categories")
    .select("order_index")
    .eq("world_id", worldId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("world_content_categories").insert({
    world_id: worldId,
    name: nameParsed.data,
    description: descriptionParsed.data || null,
    accepts_submissions: acceptsSubmissions,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return { error: error.code === "23505" ? "已經有一個同名的分類了" : "新增失敗,請稍後再試" };
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
    })
    .eq("id", categoryId);
  if (error) {
    return { error: error.code === "23505" ? "已經有一個同名的分類了" : "更新失敗,請稍後再試" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories`);
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}`);
  return undefined;
}

/** 刪除分類——底下的節點不會被刪除,只是 category_id 變回 NULL(見 schema 的 on delete set null)。 */
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

/** 分類排序:跟同世界觀裡上/下一個分類交換 order_index。 */
export async function moveContentCategory(
  categoryId: string,
  worldId: string,
  worldSlug: string,
  direction: "up" | "down",
): Promise<void> {
  const { supabase, isStaff } = await requireWorldStaff(worldId);
  if (!isStaff) {
    throw new Error("只有這個世界觀的主辦/編輯可以調整分類順序");
  }

  const { data: categories } = await supabase
    .from("world_content_categories")
    .select("id, order_index")
    .eq("world_id", worldId)
    .order("order_index", { ascending: true });
  if (!categories) return;

  const idx = categories.findIndex((c) => c.id === categoryId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= categories.length) return;

  const a = categories[idx];
  const b = categories[swapIdx];
  await Promise.all([
    supabase
      .from("world_content_categories")
      .update({ order_index: b.order_index })
      .eq("id", a.id),
    supabase
      .from("world_content_categories")
      .update({ order_index: a.order_index })
      .eq("id", b.id),
  ]);

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories`);
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}`);
}
