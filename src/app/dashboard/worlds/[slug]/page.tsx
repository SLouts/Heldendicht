import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getWorldMediaSignedUrl } from "@/lib/worldMedia";
import { getWorldMapSignedUrl } from "@/lib/worldmap";
import { WorldHero } from "./WorldHero";
import { NodeTabs, type NodeTab } from "@/app/(site)/worlds/[slug]/nodes/[nodeSlug]/NodeTabs";
import { WorldOverviewTab, type MapLayer } from "@/app/(site)/worlds/[slug]/WorldOverviewTab";
import { WorldRulesTab } from "@/app/(site)/worlds/[slug]/WorldRulesTab";
import { WorldRecentChangesTab } from "@/app/(site)/worlds/[slug]/WorldRecentChangesTab";
import { WorldSearchTab } from "@/app/(site)/worlds/[slug]/WorldSearchTab";
import { WorldSidebar } from "@/app/(site)/worlds/[slug]/WorldSidebar";
import { WorldQuickBar } from "@/app/(site)/worlds/[slug]/WorldQuickBar";
import {
  WorldDirectoryTab,
  type DashboardCategoryGroup,
  type DashboardTypeGroup,
} from "./WorldDirectoryTab";
import type { MapNode, UnplacedNode } from "./worldmap/WorldMapView";
import { FALLBACK_NODE_TYPE_ORDER } from "@/lib/nodeTypeLabels";
import { unwrapRelation } from "@/lib/unwrapRelation";

const RECENT_CHANGES_LIMIT = 8;

export default async function WorldDashboardPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]">) {
  const { slug } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select(
      "id, slug, name, tagline, description, default_pc_quota, is_public, banner_path, icon_path, owner_id, profiles(display_name, username, email)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!world) notFound();

  const owner = unwrapRelation(world.profiles);

  const [
    { data: isStaff },
    { data: isAdmin },
    { data: nodes },
    { data: relationships },
    { data: categories },
    { data: layers },
    { data: worldRules },
    { data: recentNodes },
    bannerUrl,
    iconUrl,
  ] = await Promise.all([
    supabase.rpc("is_world_staff", { p_world_id: world.id }),
    supabase.rpc("is_world_admin", { p_world_id: world.id }),
    supabase
      .from("nodes")
      .select(
        "id, title, slug, node_type, status, is_placeholder, creator_id, category_id, edit_mode, map_layer_id, map_x, map_y, characters(character_type, owner_id, profiles(display_name, username, email))",
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

  // 開放共筆節點的比例——edit_mode 是 nodes 表自己的欄位,不是世界觀或
  // 成員層級的設定,從這裡查出的節點清單直接算,不用另外查表。
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
  const placedMapNodes: MapNode[] = [];
  const unplacedMapNodes: UnplacedNode[] = [];
  for (const n of nodeRows) {
    const char = unwrapRelation(n.characters);
    const base = {
      id: n.id,
      title: n.title,
      slug: n.slug,
      nodeType: n.node_type,
      status: n.status,
      isPlaceholder: n.is_placeholder,
      characterType: char?.character_type ?? null,
    };
    if (n.map_x != null && n.map_y != null && n.map_layer_id != null) {
      placedMapNodes.push({ ...base, x: n.map_x, y: n.map_y, layerId: n.map_layer_id });
    } else {
      unplacedMapNodes.push(base);
    }
  }
  const hasVisibleMap = mapLayers.some((l) => l.imageUrl);

  const tabs: NodeTab[] = [
    {
      key: "overview",
      label: "世界導讀",
      content: (
        <WorldOverviewTab
          description={world.description}
          mapLayers={mapLayers}
          mapNodes={placedMapNodes}
          hasVisibleMap={hasVisibleMap}
          worldId={world.id}
          worldSlug={world.slug}
          basePath={`/dashboard/worlds/${world.slug}/nodes`}
          isStaff={Boolean(isStaff)}
          manageLayersHref={
            isAdmin ? `/dashboard/worlds/${world.slug}/worldmap/layers` : undefined
          }
          unplacedNodes={unplacedMapNodes}
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
          worldSlug={world.slug}
          currentUserId={user.id}
        />
      ),
    },
    {
      key: "rules",
      label: "企劃規則與手冊",
      content: (
        <WorldRulesTab
          worldRules={worldRules}
          manageHref={isStaff ? `/dashboard/worlds/${world.slug}/rules` : undefined}
        />
      ),
    },
    {
      key: "recent",
      label: "近期變更",
      content: (
        <WorldRecentChangesTab
          nodes={recentNodes}
          basePath={`/dashboard/worlds/${world.slug}/nodes`}
        />
      ),
    },
    {
      key: "search",
      label: "搜尋",
      content: (
        <WorldSearchTab worldId={world.id} basePath={`/dashboard/worlds/${world.slug}/nodes`} />
      ),
    },
  ];

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← 我的世界觀
      </Link>
      <div className="mt-2">
        <WorldHero name={world.name} tagline={world.tagline} bannerUrl={bannerUrl} iconUrl={iconUrl} />
      </div>

      <WorldQuickBar worldSlug={world.slug} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:order-2 lg:col-span-4">
          <WorldSidebar
            ownerLabel={owner?.display_name || owner?.username || owner?.email || null}
            defaultPcQuota={world.default_pc_quota}
            collaborativePercent={collaborativePercent}
            totalNodeCount={totalNodeCount}
            isPublic={world.is_public}
            navMenu={
              <>
                <Link
                  href={`/worlds/${world.slug}`}
                  className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                >
                  公開頁面
                </Link>
                <Link
                  href={`/dashboard/worlds/${world.slug}/story`}
                  className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                >
                  故事時間軸
                </Link>
                <Link
                  href={`/dashboard/worlds/${world.slug}/map`}
                  className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                >
                  關係圖
                </Link>
                <Link
                  href={`/dashboard/worlds/${world.slug}/worldmap`}
                  className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                >
                  世界地圖
                </Link>
                {isStaff && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/character-fields`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    角色必填欄位
                  </Link>
                )}
                {isStaff && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/section-templates`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    補充區塊範本
                  </Link>
                )}
                {isStaff && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/categories`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    內容分類
                  </Link>
                )}
                {isStaff && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/reports`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    檢舉列表
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/members`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    成員
                  </Link>
                )}
                {isStaff && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/settings`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    世界觀設定
                  </Link>
                )}
              </>
            }
          />
        </div>

        <div className="lg:order-1 lg:col-span-8 lg:min-w-0">
          <NodeTabs tabs={tabs} />
        </div>
      </div>
    </div>
  );
}
