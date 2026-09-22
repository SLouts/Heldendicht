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

const ExampleValueSchema = z.string().trim().max(2000, { error: "範例值最多 2000 字" });

async function requireWorldStaff(worldId: string) {
  const supabase = await createClient();
  const { data: isStaff } = await supabase.rpc("is_world_staff", {
    p_world_id: worldId,
  });
  return { supabase, isStaff: Boolean(isStaff) };
}

/**
 * 世界觀主辦/編輯自訂「分類欄位」(world_category_fields)——套用在特定
 * world_content_categories 底下所有節點(不分節點類型,角色節點也適用)
 * 的建立/編輯表單,每個欄位可以各自標記必填/選填。跟 world_character_fields
 * 同一套「模板」型態,實際填答存在 category_field_values,不像改版前那樣
 * 自動建立 node_sections 草稿。
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
  const exampleValueParsed = ExampleValueSchema.safeParse(
    formData.get("exampleValue") ?? "",
  );
  if (!exampleValueParsed.success) {
    return {
      fieldErrors: { exampleValue: [exampleValueParsed.error.issues[0].message] },
    };
  }
  const isRequired = formData.get("isRequired") === "on";

  const { supabase, isStaff } = await requireWorldStaff(worldId);
  if (!isStaff) {
    return { error: "只有這個世界觀的主辦/編輯可以新增分類欄位" };
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
    example_value: exampleValueParsed.data,
    is_required: isRequired,
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
  const exampleValueParsed = ExampleValueSchema.safeParse(
    formData.get("exampleValue") ?? "",
  );
  if (!exampleValueParsed.success) {
    return {
      fieldErrors: { exampleValue: [exampleValueParsed.error.issues[0].message] },
    };
  }
  const isRequired = formData.get("isRequired") === "on";

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("world_category_fields")
    .update(
      {
        label: labelParsed.data,
        example_value: exampleValueParsed.data,
        is_required: isRequired,
      },
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

export type CopyCategoryFieldsResult = { error: string } | { ok: true; copiedCount: number };

/**
 * 把另一個分類已經設定好的欄位清單複製一份過來,當成起點再繼續編輯——
 * 主辦/編輯規劃新分類的欄位時,不用每次都從零開始一個個手打。同名欄位
 * (目標分類已經有的 label)直接略過不複製,不會因為撞到 unique
 * (category_id, label) 而讓整批複製失敗。
 */
export async function copyCategoryFields(
  fromCategoryId: string,
  toCategoryId: string,
  worldId: string,
  worldSlug: string,
): Promise<CopyCategoryFieldsResult> {
  await requireUser();

  if (fromCategoryId === toCategoryId) {
    return { error: "來源分類跟目標分類一樣,不需要複製" };
  }

  const { supabase, isStaff } = await requireWorldStaff(worldId);
  if (!isStaff) {
    return { error: "只有這個世界觀的主辦/編輯可以複製分類欄位" };
  }

  const [{ data: sourceFields }, { data: existingFields }, { data: last }] = await Promise.all([
    supabase
      .from("world_category_fields")
      .select("label, example_value, is_required, order_index")
      .eq("category_id", fromCategoryId)
      .order("order_index", { ascending: true }),
    supabase
      .from("world_category_fields")
      .select("label")
      .eq("category_id", toCategoryId),
    supabase
      .from("world_category_fields")
      .select("order_index")
      .eq("category_id", toCategoryId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!sourceFields || sourceFields.length === 0) {
    return { error: "來源分類還沒有設定任何欄位" };
  }

  const existingLabels = new Set((existingFields ?? []).map((f) => f.label));
  const toCopy = sourceFields.filter((f) => !existingLabels.has(f.label));
  if (toCopy.length === 0) {
    return { error: "來源分類的欄位名稱都跟目標分類重複了,沒有可以複製的欄位" };
  }

  let nextOrderIndex = (last?.order_index ?? -1) + 1;
  const rows = toCopy.map((f) => ({
    world_id: worldId,
    category_id: toCategoryId,
    label: f.label,
    example_value: f.example_value,
    is_required: f.is_required,
    order_index: nextOrderIndex++,
  }));

  const { error } = await supabase.from("world_category_fields").insert(rows);
  if (error) {
    return { error: "複製失敗,請稍後再試" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/categories/${toCategoryId}/fields`);
  return { ok: true, copiedCount: rows.length };
}

export type SetCategoryFieldValuesResult = { error: string } | { ok: true };

/**
 * 批次寫入一個節點對所屬分類欄位模板的填答。建立/編輯節點時都會呼叫這裡
 * ——「這是不是你能編輯的節點」交給 can_edit_node RLS 把關;「必填欄位
 * 是否都填了」在這裡用 zod 依 fields 清單的 is_required 動態驗證,不能
 * 信任表單自己夾帶的欄位 id/是否必填,一律用當下資料庫查到的 fields
 * 清單為準。
 */
export async function setCategoryFieldValues(
  nodeId: string,
  worldSlug: string,
  fields: { id: string; label: string; isRequired: boolean }[],
  values: Record<string, string>,
): Promise<SetCategoryFieldValuesResult> {
  await requireUser();

  const shape: Record<string, z.ZodType<string>> = {};
  for (const f of fields) {
    shape[f.id] = f.isRequired
      ? z.string().trim().min(1, { error: `請填寫「${f.label}」` })
      : z.string().trim().max(2000, { error: `「${f.label}」最多 2000 字` });
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
    .from("category_field_values")
    .upsert(rows, { onConflict: "node_id,field_id" });
  if (error) {
    return { error: "儲存分類欄位失敗,請確認你有這個節點的編輯權限" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  return { ok: true };
}
