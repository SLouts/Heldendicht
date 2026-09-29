import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { NodeSearchBox } from "@/components/NodeSearchBox";
import {
  WorldDirectoryTab,
  type DashboardCategoryGroup,
  type DashboardTypeGroup,
} from "../WorldDirectoryTab";
import { FALLBACK_NODE_TYPE_ORDER } from "@/lib/nodeTypeLabels";

export default async function WorldDirectoryPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/directory">) {
  const { slug } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, default_pc_quota")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const [{ data: nodes }, { data: relationships }, { data: categories }] = await Promise.all([
    supabase
      .from("nodes")
      .select(
        "id, title, slug, node_type, status, is_placeholder, creator_id, category_id, characters(character_type, owner_id, profiles(display_name, username, email))",
      )
      .eq("world_id", world.id)
      .order("node_type")
      .order("title"),
    supabase
      .from("relationships")
      .select(
        "id, label, status, node_a:nodes!relationships_node_a_id_fkey(title), node_b:nodes!relationships_node_b_id_fkey(title)",
      )
      .eq("world_id", world.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("world_content_categories")
      .select("id, name, description, accepts_submissions, parent_id")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
  ]);

  const nodeRows = nodes ?? [];
  const uncategorizedNodes = nodeRows.filter((n) => n.category_id == null);
  const characterNodes = uncategorizedNodes.filter((n) => n.node_type === "character");
  const categoryGroups: DashboardCategoryGroup[] = (categories ?? []).map((category) => ({
    category,
    nodes: nodeRows.filter((n) => n.category_id === category.id),
  }));
  const uncategorizedByType: DashboardTypeGroup[] = FALLBACK_NODE_TYPE_ORDER.map((nodeType) => ({
    nodeType,
    nodes: uncategorizedNodes.filter((n) => n.node_type === nodeType),
  })).filter((g) => g.nodes.length > 0);

  return (
    <div>
      <WorldMainTabs basePath={`/dashboard/worlds/${world.slug}`} />

      <div className="mt-6 flex flex-col gap-8">
        <NodeSearchBox worldId={world.id} basePath={`/dashboard/worlds/${world.slug}/nodes`} />

        <WorldDirectoryTab
          categoryGroups={categoryGroups}
          uncategorizedByType={uncategorizedByType}
          characterNodes={characterNodes}
          relationships={relationships}
          defaultPcQuota={world.default_pc_quota}
          worldSlug={world.slug}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
