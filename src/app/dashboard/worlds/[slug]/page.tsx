import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getWorldMediaSignedUrl } from "@/lib/worldMedia";
import { getWorldMapSignedUrl } from "@/lib/worldmap";
import { WorldHero } from "./WorldHero";
import { WorldStatCards } from "./WorldStatCards";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { NodeSearchBox } from "@/components/NodeSearchBox";
import { NodeTabs, type NodeTab } from "@/app/(site)/worlds/[slug]/nodes/[nodeSlug]/NodeTabs";
import { WorldRulesTab } from "@/app/(site)/worlds/[slug]/WorldRulesTab";
import { WorldRecentChangesTab } from "@/app/(site)/worlds/[slug]/WorldRecentChangesTab";
import { WorldSidebar } from "@/app/(site)/worlds/[slug]/WorldSidebar";
import { WorldQuickBar } from "@/app/(site)/worlds/[slug]/WorldQuickBar";
import {
  WorldDirectoryTab,
  type DashboardCategoryGroup,
  type DashboardTypeGroup,
} from "./WorldDirectoryTab";
import { NewWorldOnboarding } from "./NewWorldOnboarding";
import { FALLBACK_NODE_TYPE_ORDER } from "@/lib/nodeTypeLabels";
import { unwrapRelation } from "@/lib/unwrapRelation";

const RECENT_CHANGES_LIMIT = 8;

export default async function WorldDashboardPage({
  params,
  searchParams,
}: PageProps<"/dashboard/worlds/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const isNewlyCreated = sp.new === "1";
  const user = await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select(
      "id, slug, name, tagline, description, default_pc_quota, is_public, is_solo, banner_path, icon_path, owner_id, profiles!worlds_owner_id_fkey(display_name, username, email)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!world) notFound();

  const owner = unwrapRelation(world.profiles);

  // 電腦版把「世界導讀/條目與節點目錄/企劃規則與手冊/近期變更/搜尋」
  // 收回同一頁用 client tab 切換(維持改版前的做法,不用整頁換頁),
  // 所以節點/分類/關係線這幾份跟 /directory 路由重複的資料在這裡也要
  // 撈一次——手機版另外走 WorldMainTabs 的路由式分頁,不用到這些。
  const [
    { data: isStaff },
    { data: isAdmin },
    { data: nodes },
    { data: relationships },
    { data: categories },
    { data: worldRules },
    { data: recentNodes },
    { data: firstMapLayer },
    bannerUrl,
    iconUrl,
  ] = await Promise.all([
    supabase.rpc("is_world_staff", { p_world_id: world.id }),
    supabase.rpc("is_world_admin", { p_world_id: world.id }),
    supabase
      .from("nodes")
      .select(
        "id, title, slug, node_type, status, is_placeholder, creator_id, category_id, edit_mode, characters(character_type, owner_id, profiles(display_name, username, email))",
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
    supabase
      .from("world_map_layers")
      .select("image_path")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle(),
    getWorldMediaSignedUrl(world.banner_path),
    getWorldMediaSignedUrl(world.icon_path),
  ]);

  const mapPreviewUrl = firstMapLayer
    ? await getWorldMapSignedUrl(firstMapLayer.image_path)
    : null;

  const nodeRows = nodes ?? [];
  const totalNodeCount = nodeRows.length;
  const collaborativeCount = nodeRows.filter((n) => n.edit_mode === "collaborative").length;
  const collaborativePercent =
    totalNodeCount === 0 ? null : Math.round((collaborativeCount / totalNodeCount) * 100);
  const pcCount = nodeRows.filter(
    (n) => n.node_type === "character" && unwrapRelation(n.characters)?.character_type === "pc",
  ).length;

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

  const descriptionContent = world.description ? (
    <p className="max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
      {world.description}
    </p>
  ) : (
    <EmptyState
      title="這個世界觀還沒有介紹文字"
      description="寫一段導讀,讓來訪的人快速了解這個世界觀的樣貌。"
      actionHref={isStaff ? `/dashboard/worlds/${world.slug}/settings` : undefined}
      actionLabel={isStaff ? "撰寫第一篇導讀" : undefined}
    />
  );

  const overviewTabContent = (
    <div className="flex flex-col gap-4">
      {descriptionContent}
      {mapPreviewUrl && (
        <Link
          href={`/dashboard/worlds/${world.slug}/worldmap`}
          className="group relative block overflow-hidden rounded-lg border border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
          <img
            src={mapPreviewUrl}
            alt=""
            className="h-48 w-full object-cover transition group-hover:opacity-90"
          />
          <span className="absolute right-2 top-2 rounded bg-surface/90 px-2 py-1 text-xs text-foreground shadow-sm">
            世界地圖預覽
          </span>
        </Link>
      )}
    </div>
  );

  const desktopTabs: NodeTab[] = [
    { key: "overview", label: "世界導讀", content: overviewTabContent },
    {
      key: "directory",
      label: "條目目錄",
      content: (
        <div className="flex flex-col gap-6">
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
      key: "rules",
      label: "規則",
      content: (
        <WorldRulesTab
          worldRules={worldRules}
          manageHref={isStaff ? `/dashboard/worlds/${world.slug}/rules` : undefined}
        />
      ),
    },
  ];

  const managementNavMenu = (
    <>
      <Link href={`/worlds/${world.slug}`} className="hover:underline">
        公開頁面
      </Link>
      <Link href={`/dashboard/worlds/${world.slug}/story`} className="hover:underline">
        故事時間軸
      </Link>
      <Link href={`/dashboard/worlds/${world.slug}/map`} className="hover:underline">
        關係圖譜
      </Link>
      <Link href={`/dashboard/worlds/${world.slug}/worldmap`} className="hover:underline">
        世界地圖
      </Link>
      {isStaff && (
        <Link
          href={`/dashboard/worlds/${world.slug}/character-template`}
          className="hover:underline"
        >
          角色卡設定
        </Link>
      )}
      {isStaff && (
        <Link href={`/dashboard/worlds/${world.slug}/categories`} className="hover:underline">
          內容分類
        </Link>
      )}
      {isStaff && !world.is_solo && (
        <Link href={`/dashboard/worlds/${world.slug}/reports`} className="hover:underline">
          檢舉列表
        </Link>
      )}
      {isAdmin && !world.is_solo && (
        <Link href={`/dashboard/worlds/${world.slug}/members`} className="hover:underline">
          成員
        </Link>
      )}
      {isStaff && (
        <Link href={`/dashboard/worlds/${world.slug}/settings`} className="hover:underline">
          世界觀設定
        </Link>
      )}
    </>
  );

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← 我的世界觀
      </Link>

      <div className="mt-2">
        <WorldHero name={world.name} tagline={world.tagline} bannerUrl={bannerUrl} iconUrl={iconUrl} />
      </div>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={world.is_public ? "info" : "neutral"}>
            {world.is_public ? "公開" : "私人"}
          </Badge>
          <Badge variant="neutral">{world.is_solo ? "個人寫作(paro)" : "多人共筆"}</Badge>
          {collaborativePercent !== null && (
            <span className="hidden lg:inline-flex">
              <Badge variant="info">共筆比例 {collaborativePercent}%</Badge>
            </span>
          )}
        </div>

        <WorldQuickBar worldSlug={world.slug} />
      </div>

      {isNewlyCreated && <NewWorldOnboarding worldSlug={world.slug} isSolo={world.is_solo} />}

      {/* 電腦版把這幾個數字挪回側邊欄用文字列呈現,這裡的卡片只在手機版顯示。 */}
      <div className="mt-6 lg:hidden">
        <WorldStatCards
          ownerLabel={owner?.display_name || owner?.username || owner?.email || null}
          collaborativePercent={collaborativePercent}
          totalNodeCount={totalNodeCount}
          pcCount={pcCount}
          defaultPcQuota={world.default_pc_quota}
        />
      </div>

      {/* 手機版(< lg):維持路由式的單一階層主分頁,這塊先不要動。 */}
      <div className="lg:hidden">
        <div className="mt-8">
          <WorldMainTabs basePath={`/dashboard/worlds/${world.slug}`} />
        </div>

        <div className="mt-6 flex flex-col gap-8">
          {descriptionContent}

          <WorldRulesTab
            worldRules={worldRules}
            manageHref={isStaff ? `/dashboard/worlds/${world.slug}/rules` : undefined}
          />

          <WorldRecentChangesTab
            nodes={recentNodes}
            basePath={`/dashboard/worlds/${world.slug}/nodes`}
          />
        </div>
      </div>

      {/* 電腦版(lg 以上):維持改版前的左右兩欄——右側邊欄放導覽/管理連結,
          左側內容用 client tab 切換(不換頁),不用手機版那套路由式主分頁。 */}
      <div className="mt-8 hidden lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:order-2 lg:col-span-3">
          <WorldSidebar
            ownerLabel={owner?.display_name || owner?.username || owner?.email || null}
            defaultPcQuota={world.default_pc_quota}
            navMenu={managementNavMenu}
          />
        </div>

        <div className="lg:order-1 lg:col-span-9 lg:min-w-0">
          <NodeTabs tabs={desktopTabs} />
        </div>
      </div>
    </div>
  );
}
