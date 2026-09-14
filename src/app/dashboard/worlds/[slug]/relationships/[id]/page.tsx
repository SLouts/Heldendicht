import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { deleteRelationship, revokeRelationship } from "@/lib/actions/relationships";
import { EditRelationshipForm } from "./EditRelationshipForm";
import { ReportForm } from "@/components/ReportForm";

export default async function RelationshipDetailPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/relationships/[id]">) {
  const { slug, id } = await params;
  const user = await requireUser();
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
      "id, label, label_reverse, description, status, creator_id, revoked_at, node_a:nodes!relationships_node_a_id_fkey(id, title, slug), node_b:nodes!relationships_node_b_id_fkey(id, title, slug)",
    )
    .eq("id", id)
    .eq("world_id", world.id)
    .maybeSingle();
  if (!rel) notFound();

  const nodeA = Array.isArray(rel.node_a) ? rel.node_a[0] : rel.node_a;
  const nodeB = Array.isArray(rel.node_b) ? rel.node_b[0] : rel.node_b;

  const { data: isStaff } = await supabase.rpc("is_world_staff", {
    p_world_id: world.id,
  });

  const isCreator = rel.creator_id === user.id;
  const canEdit = Boolean(isStaff) || isCreator;
  const canRevoke = canEdit && rel.status === "active";
  const canDelete = Boolean(isStaff);

  return (
    <div className="max-w-2xl">
      <Link
        href={`/dashboard/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">
          {nodeA && (
            <Link
              href={`/dashboard/worlds/${world.slug}/nodes/${nodeA.slug}`}
              className="hover:underline"
            >
              {nodeA.title}
            </Link>
          )}
          <span className="mx-2 text-muted-foreground">↔</span>
          {nodeB && (
            <Link
              href={`/dashboard/worlds/${world.slug}/nodes/${nodeB.slug}`}
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

      <div className="mt-6">
        {canEdit ? (
          <EditRelationshipForm
            relationshipId={rel.id}
            worldSlug={world.slug}
            label={rel.label ?? ""}
            labelReverse={rel.label_reverse ?? ""}
            description={rel.description ?? ""}
          />
        ) : (
          rel.description && (
            <p className="whitespace-pre-wrap text-sm">{rel.description}</p>
          )
        )}
      </div>

      <div className="mt-6 flex gap-4">
        {canRevoke && (
          <form action={revokeRelationship.bind(null, rel.id, world.slug)}>
            <button className="text-sm text-badge-pending-fg underline">
              撤銷這條關係線
            </button>
          </form>
        )}
        {canDelete && (
          <form action={deleteRelationship.bind(null, rel.id, world.slug)}>
            <button className="text-sm text-danger underline">
              強制刪除
            </button>
          </form>
        )}
      </div>

      <ReportForm
        targetType="relationship"
        targetId={rel.id}
        redirectPath={`/dashboard/worlds/${world.slug}/relationships/${rel.id}`}
      />
    </div>
  );
}
