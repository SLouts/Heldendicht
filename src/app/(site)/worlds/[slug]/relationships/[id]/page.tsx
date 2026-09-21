import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";

/**
 * 公開版關係線詳細頁,純唯讀——沒有撤銷/刪除/檢舉這些操作(那些都是要
 * 綁定登入身分的動作)。可見度完全交給 relationships_select RLS
 * (status='active' + can_view_world_content),不另外收斂。
 */
export default async function PublicRelationshipDetailPage({
  params,
}: PageProps<"/worlds/[slug]/relationships/[id]">) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: rel } = await supabase
    .from("relationships")
    .select(
      "id, label, label_reverse, description, status, revoked_at, node_a:nodes!relationships_node_a_id_fkey(title, slug), node_b:nodes!relationships_node_b_id_fkey(title, slug)",
    )
    .eq("id", id)
    .eq("world_id", world.id)
    .maybeSingle();
  if (!rel) notFound();

  const nodeA = unwrapRelation(rel.node_a);
  const nodeB = unwrapRelation(rel.node_b);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link
        href={`/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">
          {nodeA && (
            <Link
              href={`/worlds/${world.slug}/nodes/${nodeA.slug}`}
              className="hover:underline"
            >
              {nodeA.title}
            </Link>
          )}
          <span className="mx-2 text-muted-foreground">↔</span>
          {nodeB && (
            <Link
              href={`/worlds/${world.slug}/nodes/${nodeB.slug}`}
              className="hover:underline"
            >
              {nodeB.title}
            </Link>
          )}
        </h1>
        {rel.status === "revoked" && (
          <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
            已撤銷
          </span>
        )}
      </div>

      {(rel.label || rel.label_reverse) && (
        <p className="mt-1 text-sm text-muted-foreground">
          {rel.label && (
            <>
              {nodeA?.title} → {nodeB?.title}:{rel.label}
            </>
          )}
          {rel.label && rel.label_reverse && "  ·  "}
          {rel.label_reverse && (
            <>
              {nodeB?.title} → {nodeA?.title}:{rel.label_reverse}
            </>
          )}
        </p>
      )}

      {rel.status === "revoked" && rel.revoked_at && (
        <p className="mt-1 text-xs text-muted-foreground">
          於 {new Date(rel.revoked_at).toLocaleString("zh-TW")} 撤銷
        </p>
      )}

      {rel.description && (
        <p className="mt-6 whitespace-pre-wrap text-sm">{rel.description}</p>
      )}
    </div>
  );
}
