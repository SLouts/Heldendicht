import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { NewRelationshipForm } from "./NewRelationshipForm";

export default async function NewRelationshipPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/relationships/new">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: nodes } = await supabase
    .from("nodes")
    .select("id, title, node_type")
    .eq("world_id", world.id)
    .order("node_type")
    .order("title");

  return (
    <div>
      <Link
        href={`/dashboard/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        在「{world.name}」建立人際關係線
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        關係線免審核,建立後立即生效;主辦之後可以撤銷或強制斷線。
      </p>
      {nodes && nodes.length >= 2 ? (
        <NewRelationshipForm
          worldId={world.id}
          worldSlug={world.slug}
          nodes={nodes}
        />
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          這個世界觀至少要有兩個節點(地點/物產/角色)才能建立關係線。
        </p>
      )}
    </div>
  );
}
