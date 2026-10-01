import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { NodeSearchBox } from "@/components/NodeSearchBox";
import { WorldDirectoryTab, type CategoryGroup, type TypeGroup } from "../WorldDirectoryTab";
import { FALLBACK_NODE_TYPE_ORDER } from "@/lib/nodeTypeLabels";

export default async function PublicWorldDirectoryPage({
  params,
}: PageProps<"/worlds/[slug]/directory">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, default_pc_quota")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const [{ data: nodes }, { data: relationships }, { data: categories }, { data: categoryFields }] =
    await Promise.all([
      supabase
        .from("nodes")
        .select(
          "id, title, slug, node_type, status, is_placeholder, category_id, characters(character_type, owner_id, profiles(display_name, username))",
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
      supabase
        .from("world_category_fields")
        .select("category_id, label, example_value")
        .eq("world_id", world.id)
        .order("order_index", { ascending: true }),
    ]);

  const nodeRows = nodes ?? [];
  const uncategorizedNodes = nodeRows.filter((n) => n.category_id == null);
  const characterNodes = uncategorizedNodes.filter((n) => n.node_type === "character");
  const categoryGroups: CategoryGroup[] = (categories ?? []).map((category) => ({
    category,
    nodes: nodeRows.filter((n) => n.category_id === category.id),
  }));
  const uncategorizedByType: TypeGroup[] = FALLBACK_NODE_TYPE_ORDER.map((nodeType) => ({
    nodeType,
    nodes: uncategorizedNodes.filter((n) => n.node_type === nodeType),
  })).filter((g) => g.nodes.length > 0);

  // 條目目錄分類清單頂端的「複製分類範本」要用——同一份 category_id →
  // 欄位清單的分組邏輯跟 NewNodeForm/nodes/new/page.tsx 一致。
  const fieldsByCategory: Record<string, { label: string; exampleValue: string }[]> = {};
  for (const f of categoryFields ?? []) {
    (fieldsByCategory[f.category_id] ??= []).push({ label: f.label, exampleValue: f.example_value });
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
      <WorldMainTabs basePath={`/worlds/${slug}`} />

      <div className="mt-6 flex flex-col gap-8">
        <NodeSearchBox worldId={world.id} basePath={`/worlds/${slug}/nodes`} />

        <WorldDirectoryTab
          categoryGroups={categoryGroups}
          uncategorizedByType={uncategorizedByType}
          characterNodes={characterNodes}
          relationships={relationships}
          defaultPcQuota={world.default_pc_quota}
          worldSlug={slug}
          fieldsByCategory={fieldsByCategory}
        />
      </div>
    </div>
  );
}
