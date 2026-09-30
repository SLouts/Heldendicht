import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorldMediaSignedUrl } from "@/lib/worldMedia";
import { WorldHero } from "@/app/dashboard/worlds/[slug]/WorldHero";
import { WorldStatCards } from "@/app/dashboard/worlds/[slug]/WorldStatCards";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { NodeSearchBox } from "@/components/NodeSearchBox";
import { NodeTabs, type NodeTab } from "@/app/(site)/worlds/[slug]/nodes/[nodeSlug]/NodeTabs";
import { WorldRulesTab } from "./WorldRulesTab";
import { WorldRecentChangesTab } from "./WorldRecentChangesTab";
import { WorldSidebar } from "./WorldSidebar";
import { WorldQuickBar } from "./WorldQuickBar";
import { WorldDirectoryTab, type CategoryGroup, type TypeGroup } from "./WorldDirectoryTab";
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
      "id, name, tagline, description, default_pc_quota, is_public, is_solo, banner_path, icon_path, owner_id, profiles!worlds_owner_id_fkey(display_name, username)",
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
  //
  // 電腦版把「條目與節點目錄/搜尋」收回同一頁用 client tab 切換(維持
  // 改版前的做法),所以節點/分類/關係線這幾份跟 /directory 路由重複的
  // 資料在這裡也要撈一次——手機版另外走 WorldMainTabs 的路由式分頁,
  // 不用到這些。
  const [{ data: nodes }, { data: relationships }, { data: categories }, { data: worldRules }, { data: recentNodes }, bannerUrl, iconUrl] =
    await Promise.all([
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
      getWorldMediaSignedUrl(world.banner_path),
      getWorldMediaSignedUrl(world.icon_path),
    ]);

  // 開放共筆節點的比例——edit_mode 是 nodes 表自己的欄位(每個節點各自
  // 決定要不要開放協作編輯),不是世界觀或成員層級的設定,所以從這裡查出
  // 的節點清單直接算,不用另外查表。
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
  const categoryGroups: CategoryGroup[] = (categories ?? []).map((category) => ({
    category,
    nodes: nodeRows.filter((n) => n.category_id === category.id),
  }));
  const uncategorizedByType: TypeGroup[] = FALLBACK_NODE_TYPE_ORDER.map((nodeType) => ({
    nodeType,
    nodes: uncategorizedNodes.filter((n) => n.node_type === nodeType),
  })).filter((g) => g.nodes.length > 0);

  const descriptionContent = world.description ? (
    <p className="max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
      {world.description}
    </p>
  ) : (
    <EmptyState title="這個世界觀還沒有介紹文字" description="主辦還沒有寫下這個世界觀的導讀。" />
  );

  const desktopTabs: NodeTab[] = [
    { key: "overview", label: "世界導讀", content: descriptionContent },
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
    { key: "rules", label: "企劃規則與手冊", content: <WorldRulesTab worldRules={worldRules} /> },
    {
      key: "recent",
      label: "近期變更",
      content: <WorldRecentChangesTab nodes={recentNodes} basePath={`/worlds/${slug}/nodes`} />,
    },
    {
      key: "search",
      label: "搜尋",
      content: <NodeSearchBox worldId={world.id} basePath={`/worlds/${slug}/nodes`} />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <WorldHero name={world.name} tagline={world.tagline} bannerUrl={bannerUrl} iconUrl={iconUrl} />

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Badge variant={world.is_public ? "info" : "neutral"}>
          {world.is_public ? "公開" : "私人"}
        </Badge>
        <Badge variant="neutral">{world.is_solo ? "個人寫作(paro)" : "多人共筆"}</Badge>
      </div>

      <WorldQuickBar worldSlug={slug} />

      <div className="mt-6">
        <WorldStatCards
          ownerLabel={owner?.display_name || owner?.username || null}
          collaborativePercent={collaborativePercent}
          totalNodeCount={totalNodeCount}
          pcCount={pcCount}
          defaultPcQuota={world.default_pc_quota}
        />
      </div>

      {/* 手機版(< lg):維持路由式的單一階層主分頁,這塊先不要動。 */}
      <div className="lg:hidden">
        <div className="mt-8">
          <WorldMainTabs basePath={`/worlds/${slug}`} />
        </div>

        <div className="mt-6 flex flex-col gap-8">
          {descriptionContent}

          <WorldRulesTab worldRules={worldRules} />

          <WorldRecentChangesTab nodes={recentNodes} basePath={`/worlds/${slug}/nodes`} />

          <p className="text-xs text-muted-foreground">
            對特定節點或關係線有疑慮嗎?到該節點/關係線自己的頁面可以個別檢舉,主辦會盡快處理。
          </p>
        </div>
      </div>

      {/* 電腦版(lg 以上):維持改版前的左右兩欄——右側邊欄放導覽連結,
          左側內容用 client tab 切換(不換頁),不用手機版那套路由式主分頁。 */}
      <div className="mt-8 hidden lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:order-2 lg:col-span-4">
          <WorldSidebar
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
                  關係圖譜
                </Link>
                <Link
                  href={`/worlds/${slug}/worldmap`}
                  className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                >
                  世界地圖
                </Link>
              </>
            }
            footerNote="對特定節點或關係線有疑慮嗎?到該節點/關係線自己的頁面可以個別檢舉,主辦會盡快處理。"
          />
        </div>

        <div className="lg:order-1 lg:col-span-8 lg:min-w-0">
          <NodeTabs tabs={desktopTabs} />
        </div>
      </div>
    </div>
  );
}
