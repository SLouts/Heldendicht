import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorldMapSignedUrl } from "@/lib/worldmap";
import { getWorldMediaSignedUrl } from "@/lib/worldMedia";
import type { MapNode } from "@/app/dashboard/worlds/[slug]/worldmap/WorldMapView";
import { WorldHero } from "@/app/dashboard/worlds/[slug]/WorldHero";
import { NodeTabs, type NodeTab } from "@/app/(site)/worlds/[slug]/nodes/[nodeSlug]/NodeTabs";
import { WorldOverviewTab, type MapLayer } from "./WorldOverviewTab";
import { WorldDirectoryTab, type CategoryGroup, type TypeGroup } from "./WorldDirectoryTab";
import { WorldRulesTab } from "./WorldRulesTab";
import { WorldRecentChangesTab } from "./WorldRecentChangesTab";
import { WorldSearchTab } from "./WorldSearchTab";
import { WorldSidebar } from "./WorldSidebar";
import { WorldQuickBar } from "./WorldQuickBar";
import { FALLBACK_NODE_TYPE_ORDER } from "@/lib/nodeTypeLabels";
import { unwrapRelation } from "@/lib/unwrapRelation";

const RECENT_CHANGES_LIMIT = 8;

export default async function WorldPage({
  params,
}: PageProps<"/worlds/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select(
      "id, name, tagline, description, default_pc_quota, banner_path, icon_path, owner_id, profiles(display_name, username)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!world) {
    // RLS 會讓「不存在」跟「存在但你看不到(私有世界觀非成員)」回傳一樣的結果,
    // 這是刻意的 —— 不會洩漏「這個世界觀其實存在,只是你不能看」的資訊。
    notFound();
  }

  const owner = unwrapRelation(world.profiles);

  // 未登入訪客看得到的東西,跟登入後的一般成員完全一樣——不管是節點、
  // 角色、關係線,可見度都只交給資料庫的 RLS 判斷(is_public/是否為
  // 成員/status <> rejected 等),這裡不再額外用 status='approved' 之類
  // 的條件收斂一次。跟登入後唯一的差異只有「不能建立/編輯」。
  const [
    { data: nodes },
    { data: relationships },
    { data: categories },
    { data: layers },
    { data: mapNodes },
    { data: worldRules },
    { data: recentNodes },
    bannerUrl,
    iconUrl,
  ] = await Promise.all([
    supabase
      .from("nodes")
      .select(
        "id, title, slug, node_type, status, is_placeholder, category_id, edit_mode, characters(character_type, owner_id, profiles(display_name, username))",
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
      .select("id, name, description, accepts_submissions")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("world_map_layers")
      .select("id, name, image_path")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("nodes")
      .select(
        "id, title, slug, node_type, status, is_placeholder, map_layer_id, map_x, map_y, characters(character_type)",
      )
      .eq("world_id", world.id)
      .not("map_x", "is", null),
    supabase
      .from("world_rule_fields")
      .select("id, label, content")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("nodes")
      .select("id, title, slug, node_type, status, updated_at")
      .eq("world_id", world.id)
      .eq("is_placeholder", false)
      .order("updated_at", { ascending: false })
      .limit(RECENT_CHANGES_LIMIT),
    getWorldMediaSignedUrl(world.banner_path),
    getWorldMediaSignedUrl(world.icon_path),
  ]);

  // 有掛分類的節點,顯示交給「條目與節點目錄」分頁的分類導覽區塊;沒掛
  // 分類的節點才落回舊的「地點/物產」「角色」兩欄分法,兩邊不會重複列出
  // 同一個節點。
  const nodeRows = nodes ?? [];
  const uncategorizedNodes = nodeRows.filter((n) => n.category_id == null);
  const characterNodes = uncategorizedNodes.filter((n) => n.node_type === "character");
  const categoryGroups: CategoryGroup[] = (categories ?? []).map((category) => ({
    category,
    nodes: nodeRows.filter((n) => n.category_id === category.id),
  }));
  // 沒掛分類的地點/物產/勢力/概念/事件/文章,照類型分開展示成一個個下拉區塊,
  // 不要全部混在同一條清單裡。
  const uncategorizedByType: TypeGroup[] = FALLBACK_NODE_TYPE_ORDER.map((nodeType) => ({
    nodeType,
    nodes: uncategorizedNodes.filter((n) => n.node_type === nodeType),
  })).filter((g) => g.nodes.length > 0);

  // 開放共筆節點的比例——edit_mode 是 nodes 表自己的欄位(每個節點各自
  // 決定要不要開放協作編輯),不是世界觀或成員層級的設定,所以從這裡查出
  // 的節點清單直接算,不用另外查表。
  const totalNodeCount = nodeRows.length;
  const collaborativeCount = nodeRows.filter((n) => n.edit_mode === "collaborative").length;
  const collaborativePercent =
    totalNodeCount === 0 ? null : Math.round((collaborativeCount / totalNodeCount) * 100);

  const mapLayers: MapLayer[] = await Promise.all(
    (layers ?? []).map(async (l) => ({
      id: l.id,
      name: l.name,
      imageUrl: await getWorldMapSignedUrl(l.image_path),
    })),
  );
  const placedNodes: MapNode[] = (mapNodes ?? []).map((n) => {
    const char = unwrapRelation(n.characters);
    return {
      id: n.id,
      title: n.title,
      slug: n.slug,
      nodeType: n.node_type,
      status: n.status,
      isPlaceholder: n.is_placeholder,
      characterType: char?.character_type ?? null,
      x: n.map_x!,
      y: n.map_y!,
      layerId: n.map_layer_id!,
    };
  });
  const hasVisibleMap = mapLayers.some((l) => l.imageUrl);

  const tabs: NodeTab[] = [
    {
      key: "overview",
      label: "世界導讀",
      content: (
        <WorldOverviewTab
          description={world.description}
          mapLayers={mapLayers}
          mapNodes={placedNodes}
          hasVisibleMap={hasVisibleMap}
          worldId={world.id}
          worldSlug={slug}
          basePath={`/worlds/${slug}/nodes`}
        />
      ),
    },
    {
      key: "directory",
      label: "條目與節點目錄",
      content: (
        <WorldDirectoryTab
          categoryGroups={categoryGroups}
          uncategorizedByType={uncategorizedByType}
          characterNodes={characterNodes}
          relationships={relationships}
          defaultPcQuota={world.default_pc_quota}
          worldSlug={slug}
        />
      ),
    },
    {
      key: "rules",
      label: "企劃規則與手冊",
      content: <WorldRulesTab worldRules={worldRules} />,
    },
    {
      key: "recent",
      label: "近期變更",
      content: <WorldRecentChangesTab nodes={recentNodes} basePath={`/worlds/${slug}/nodes`} />,
    },
    {
      key: "search",
      label: "搜尋",
      content: <WorldSearchTab worldId={world.id} basePath={`/worlds/${slug}/nodes`} />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <WorldHero name={world.name} tagline={world.tagline} bannerUrl={bannerUrl} iconUrl={iconUrl} />

      <WorldQuickBar worldSlug={slug} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:order-2 lg:col-span-4">
          <WorldSidebar
            ownerLabel={owner?.display_name || owner?.username || null}
            defaultPcQuota={world.default_pc_quota}
            collaborativePercent={collaborativePercent}
            totalNodeCount={totalNodeCount}
            navMenu={
              <>
                <Link
                  href={`/worlds/${slug}/story`}
                  className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                >
                  故事時間軸
                </Link>
                <Link
                  href={`/worlds/${slug}/map`}
                  className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                >
                  關係圖
                </Link>
              </>
            }
            footerNote="對特定節點或關係線有疑慮嗎?到該節點/關係線自己的頁面可以個別檢舉,主辦會盡快處理。"
          />
        </div>

        <div className="lg:order-1 lg:col-span-8 lg:min-w-0">
          <NodeTabs tabs={tabs} />
        </div>
      </div>
    </div>
  );
}
