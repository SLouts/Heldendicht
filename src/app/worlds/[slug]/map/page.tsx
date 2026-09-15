import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeGraphLayout } from "@/lib/storymap-layout";
import StoryMapGraph, {
  type RelEdge,
  type WikiEdge,
} from "@/app/dashboard/worlds/[slug]/map/StoryMapGraph";

type GraphNodeData = {
  id: string;
  title: string;
  slug: string;
  nodeType: string;
  status: string;
  isPlaceholder: boolean;
  characterType: "pc" | "npc" | null;
};

const WIDTH = 900;

/**
 * 公開版關係圖,唯讀——邏輯完全比照後台版(dashboard/worlds/[slug]/map),
 * 只是不需要登入,可見度交給 nodes/relationships/wikilinks 各自的 RLS。
 */
export default async function PublicStoryMapPage({
  params,
}: PageProps<"/worlds/[slug]/map">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: nodes } = await supabase
    .from("nodes")
    .select(
      "id, title, slug, node_type, status, is_placeholder, characters(character_type)",
    )
    .eq("world_id", world.id)
    .order("node_type")
    .order("title");

  const graphNodes: GraphNodeData[] = (nodes ?? []).map((n) => {
    const char = Array.isArray(n.characters) ? n.characters[0] : n.characters;
    return {
      id: n.id,
      title: n.title,
      slug: n.slug,
      nodeType: n.node_type,
      status: n.status,
      isPlaceholder: n.is_placeholder,
      characterType: char?.character_type ?? null,
    };
  });

  const nodeIds = graphNodes.map((n) => n.id);
  const statusMap = new Map(graphNodes.map((n) => [n.id, n.status]));

  const [{ data: relationships }, { data: wikilinks }] = await Promise.all([
    supabase
      .from("relationships")
      .select("id, node_a_id, node_b_id, label, status")
      .eq("world_id", world.id),
    nodeIds.length > 0
      ? supabase
          .from("wikilinks")
          .select("source_node_id, target_node_id")
          .in("source_node_id", nodeIds)
      : Promise.resolve({ data: [] as { source_node_id: string; target_node_id: string }[] }),
  ]);

  const relEdges: RelEdge[] = (relationships ?? []).map((r) => ({
    kind: "relationship",
    source: r.node_a_id,
    target: r.node_b_id,
    label: r.label,
    dashed:
      r.status === "revoked" ||
      statusMap.get(r.node_a_id) !== "approved" ||
      statusMap.get(r.node_b_id) !== "approved",
  }));

  const seenWikiPairs = new Set<string>();
  const wikiEdges: WikiEdge[] = [];
  for (const w of wikilinks ?? []) {
    const key = [w.source_node_id, w.target_node_id].sort().join("|");
    if (seenWikiPairs.has(key)) continue;
    seenWikiPairs.add(key);
    const alreadyRelated = relEdges.some(
      (r) =>
        (r.source === w.source_node_id && r.target === w.target_node_id) ||
        (r.source === w.target_node_id && r.target === w.source_node_id),
    );
    if (alreadyRelated || w.source_node_id === w.target_node_id) continue;
    wikiEdges.push({
      kind: "wikilink",
      source: w.source_node_id,
      target: w.target_node_id,
    });
  }

  const height = Math.max(480, Math.min(900, 140 + graphNodes.length * 26));
  const positioned = computeGraphLayout(
    graphNodes.map((n) => ({ id: n.id })),
    [...relEdges, ...wikiEdges].map((e) => ({ source: e.source, target: e.target })),
    WIDTH,
    height,
  );
  const posMap = new Map(positioned.map((p) => [p.id, p]));
  const positionedNodes = graphNodes.map((n) => ({
    ...n,
    x: posMap.get(n.id)?.x ?? WIDTH / 2,
    y: posMap.get(n.id)?.y ?? height / 2,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Link
        href={`/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{world.name} 的關係圖</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        點節點可以跳到詳細頁,拖曳空白處可以平移,滾輪(或雙指縮放)可以放大縮小。實線是生效中的人際關係線,虛線是已撤銷或牽涉到未過審節點的關係線,細點線是內文 WikiLink 提及。
      </p>

      {graphNodes.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">這個世界觀還沒有節點。</p>
      ) : (
        <>
          <StoryMapGraph
            nodes={positionedNodes}
            relEdges={relEdges}
            wikiEdges={wikiEdges}
            width={WIDTH}
            height={height}
            basePath={`/worlds/${world.slug}/nodes`}
          />

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <LegendDot color="var(--success)" label="地點" />
            <LegendDot color="var(--primary)" label="物產" />
            <LegendDot color="var(--badge-info-fg)" label="PC" />
            <LegendDot color="var(--muted-foreground)" label="NPC / 待撰寫" />
            <span>── 實線:生效關係線</span>
            <span>┄┄ 虛線:已撤銷 / 未過審</span>
            <span>···· 細點線:WikiLink 提及</span>
            <span>◌ 虛線圈:節點未過審</span>
          </div>
        </>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
