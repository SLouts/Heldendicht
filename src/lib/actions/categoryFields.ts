"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { moveOrderedItem } from "@/lib/orderedList";

export type CategoryFieldFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const LabelSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入欄位名稱" })
  .max(30, { error: "欄位名稱最多 30 字" });

const DefaultValueSchema = z.string().trim().max(2000, { error: "預設內容最多 2000 字" });

async function requireWorldStaff(worldId: string) {
  const supabase = await createClient();
  const { data: isStaff } = await supabase.rpc("is_world_staff", {
    p_world_id: worldId,
  });
  return { supabase, isStaff: Boolean(isStaff) };
}

/**
 * 世界觀主辦/編輯自訂「分類預設欄位」(world_category_fields)——套用在
 * 特定 world_content_categories 底下的節點,建立節點時如果選了這個分類,
 * 會依這些欄位定義自動建立對應的 node_sections(標題 = label,內容 =
 * default_value)。純粹是「預先帶入」,不像角色必填欄位那樣擋提交——
 * 這裡沒有「填答」表,建立後就是普通的 node_sections,可以自由編輯/刪除。
 */
export async function createCategoryField(
  _prevState: CategoryFieldFormState,
  formData: FormData,
): Promise<CategoryFieldFormState> {
  await requireUser();

  const worldId = formData.get("worldId");
  const categoryId = formData.get("categoryId");
  const worldSlug = formData.get("worldSlug");
  if (
    typeof worldId !== "string" ||
    typeof categoryId !== "string" ||
    typeof worldSlug !== "string"
  ) {
    return { error: "缺少必要欄位" };
  }

  const labelParsed = LabelSchema.safeParse(formData.get("label") ?? "");
  if (!labelParsed.success) {
    return { fieldErrors: { label: [labelParsed.error.issues[0].message] } };
  }
  const defaultValueParsed = DefaultValueSchema.safeParse(
    formData.get("defaultValue") ?? "",
  );
  if (!defaultValueParsed.success) {
    return {
      fieldErrors: { defaultValue: [defaultValueParsed.error.issues[0].message] },
    };
  }

  const { supabase, isStaff } = await requireWorldStaff(worldId);
  if (!isStaff) {
    return { error: "只有這個世界觀的主辦/編輯可以新增分類預設欄位" };
  }

  const { data: last } = await supabase
    .from("world_category_fields")
    .select("order_index")
    .eq("category_id", categoryId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("world_category_fields").insert({
    world_id: worldId,
    category_id: categoryId,
    label: labelParsed.data,
    default_value: defaultValueParsed.data,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "已經有一個同名的欄位了" : "新增失敗,請稍後再試",
    };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories/${categoryId}/fields`);
  return undefined;
}

export async function updateCategoryField(
  _prevState: CategoryFieldFormState,
  formData: FormData,
): Promise<CategoryFieldFormState> {
  await requireUser();

  const fieldId = formData.get("fieldId");
  const worldSlug = formData.get("worldSlug");
  const categoryId = formData.get("categoryId");
  if (
    typeof fieldId !== "string" ||
    typeof worldSlug !== "string" ||
    typeof categoryId !== "string"
  ) {
    return { error: "缺少必要欄位" };
  }

  const labelParsed = LabelSchema.safeParse(formData.get("label") ?? "");
  if (!labelParsed.success) {
    return { fieldErrors: { label: [labelParsed.error.issues[0].message] } };
  }
  const defaultValueParsed = DefaultValueSchema.safeParse(
    formData.get("defaultValue") ?? "",
  );
  if (!defaultValueParsed.success) {
    return {
      fieldErrors: { defaultValue: [defaultValueParsed.error.issues[0].message] },
    };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("world_category_fields")
    .update(
      { label: labelParsed.data, default_value: defaultValueParsed.data },
      { count: "exact" },
    )
    .eq("id", fieldId);
  if (error || count === 0) {
    return {
      error:
        error?.code === "23505"
          ? "已經有一個同名的欄位了"
          : "更新失敗,請確認你是這個世界觀的主辦或編輯",
    };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories/${categoryId}/fields`);
  return undefined;
}

export async function deleteCategoryField(
  fieldId: string,
  categoryId: string,
  worldSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("world_category_fields")
    .delete({ count: "exact" })
    .eq("id", fieldId);
  if (error || count === 0) {
    throw new Error("刪除失敗,或你沒有權限");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories/${categoryId}/fields`);
}

/** 上移/下移一個欄位:跟同分類下相鄰的欄位互換 order_index。 */
export async function moveCategoryField(
  fieldId: string,
  categoryId: string,
  worldSlug: string,
  direction: "up" | "down",
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await moveOrderedItem({
    supabase,
    table: "world_category_fields",
    itemId: fieldId,
    group: { column: "category_id", value: categoryId },
    direction,
  });
  if (error) throw new Error(error);

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories/${categoryId}/fields`);
}
