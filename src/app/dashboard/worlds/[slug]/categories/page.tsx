import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { CategoriesEditor } from "./CategoriesEditor";

export default async function ContentCategoriesPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/categories">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: isStaff } = await supabase.rpc("is_world_staff", {
    p_world_id: world.id,
  });

  if (!isStaff) {
    return (
      <div>
        <BackLink slug={slug} />
        <h1 className="mt-2 text-2xl font-semibold">內容分類</h1>
      </div>
    );
  }

  const { data: categories } = await supabase
    .from("world_content_categories")
    .select("id, name, description, accepts_submissions")
    .eq("world_id", world.id)
    .order("order_index", { ascending: true });

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">內容分類</h1>
      <CategoriesEditor
        worldId={world.id}
        worldSlug={world.slug}
        categories={categories ?? []}
      />
    </div>
  );
}

function BackLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/dashboard/worlds/${slug}`}
      className="text-sm text-muted-foreground hover:underline"
    >
      ← 返回世界觀
    </Link>
  );
}
