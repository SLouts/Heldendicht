import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { NewNodeForm } from "./NewNodeForm";

export default async function NewNodePage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/nodes/new">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!world) notFound();

  const [{ data: isStaff }, { data: categories }, { data: categoryFields }] =
    await Promise.all([
      supabase.rpc("is_world_staff", { p_world_id: world.id }),
      supabase
        .from("world_content_categories")
        .select("id, name, accepts_submissions, parent_id")
        .eq("world_id", world.id)
        .order("order_index", { ascending: true }),
      supabase
        .from("world_category_fields")
        .select(
          "id, category_id, label, is_required, field_type, options, range_min, range_max, range_step",
        )
        .eq("world_id", world.id)
        .order("order_index", { ascending: true }),
    ]);

  // 只列出使用者實際能選的分類:staff 什麼都能選,一般成員只能看到
  // 開放投稿的——避免選了一個送出去一定會被 guard_node_category 擋下的選項。
  const selectableCategories = (categories ?? []).filter(
    (c) => c.accepts_submissions || isStaff,
  );

  // 分組成 { categoryId: [欄位, ...] },給表單依選擇的分類即時顯示對應的
  // 必填/選填欄位輸入框,不用另外打 API。
  const fieldsByCategory: Record<
    string,
    {
      id: string;
      label: string;
      isRequired: boolean;
      fieldType: "text" | "select" | "range";
      options: string[];
      rangeMin: number | null;
      rangeMax: number | null;
      rangeStep: number | null;
    }[]
  > = {};
  for (const f of categoryFields ?? []) {
    (fieldsByCategory[f.category_id] ??= []).push({
      id: f.id,
      label: f.label,
      isRequired: f.is_required,
      fieldType: f.field_type,
      options: f.options,
      rangeMin: f.range_min,
      rangeMax: f.range_max,
      rangeStep: f.range_step,
    });
  }

  return (
    <div>
      <Link
        href={`/dashboard/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">在「{world.name}」新增節點</h1>
      <NewNodeForm
        worldId={world.id}
        worldSlug={world.slug}
        categories={selectableCategories}
        fieldsByCategory={fieldsByCategory}
        isStaff={Boolean(isStaff)}
      />
    </div>
  );
}
