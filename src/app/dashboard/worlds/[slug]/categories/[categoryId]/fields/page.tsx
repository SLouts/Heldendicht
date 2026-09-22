import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { CategoryFieldsEditor } from "./CategoryFieldsEditor";

export default async function CategoryFieldsPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/categories/[categoryId]/fields">) {
  const { slug, categoryId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: category } = await supabase
    .from("world_content_categories")
    .select("id, name")
    .eq("id", categoryId)
    .eq("world_id", world.id)
    .maybeSingle();
  if (!category) notFound();

  const { data: isStaff } = await supabase.rpc("is_world_staff", {
    p_world_id: world.id,
  });

  if (!isStaff) {
    return (
      <div>
        <BackLink slug={slug} />
        <h1 className="mt-2 text-2xl font-semibold">「{category.name}」的預設欄位</h1>
      </div>
    );
  }

  const [{ data: fields }, { data: otherCategories }] = await Promise.all([
    supabase
      .from("world_category_fields")
      .select("id, label, example_value, is_required")
      .eq("category_id", category.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("world_content_categories")
      .select("id, name, world_category_fields(id)")
      .eq("world_id", world.id)
      .neq("id", category.id)
      .order("order_index", { ascending: true }),
  ]);

  const copySources = (otherCategories ?? [])
    .map((c) => ({ id: c.id, name: c.name, fieldCount: c.world_category_fields.length }))
    .filter((c) => c.fieldCount > 0);

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">「{category.name}」的欄位</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        建立/編輯這個分類底下的節點時(不分節點類型,角色節點也適用),
        會出現下面的欄位讓玩家填答——標記必填的欄位不能留空才能送出,
        選填的可以留空。
      </p>
      <CategoryFieldsEditor
        worldId={world.id}
        worldSlug={world.slug}
        categoryId={category.id}
        fields={fields ?? []}
        copySources={copySources}
      />
    </div>
  );
}

function BackLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/dashboard/worlds/${slug}/categories`}
      className="text-sm text-muted-foreground hover:underline"
    >
      ← 返回內容分類
    </Link>
  );
}
