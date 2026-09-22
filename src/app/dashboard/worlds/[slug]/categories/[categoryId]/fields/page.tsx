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

  const { data: fields } = await supabase
    .from("world_category_fields")
    .select("id, label, default_value")
    .eq("category_id", category.id)
    .order("order_index", { ascending: true });

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">「{category.name}」的預設欄位</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        建立這個分類底下的節點時,會自動依下面的欄位建立對應的補充區塊(標題
        + 預設內容),純粹是先幫使用者打好草稿——可以留空、覆蓋或整段刪除,
        不會擋節點送出。
      </p>
      <CategoryFieldsEditor
        worldId={world.id}
        worldSlug={world.slug}
        categoryId={category.id}
        fields={fields ?? []}
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
