import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { getWorldMediaSignedUrl, getWorldOgImageUrl } from "@/lib/worldMedia";
import { getWorldMapSignedUrl } from "@/lib/worldmap";
import { WorldHero } from "@/app/dashboard/worlds/[slug]/WorldHero";
import { WorldStatCards } from "@/app/dashboard/worlds/[slug]/WorldStatCards";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { NodeTabs, type NodeTab } from "@/app/(site)/worlds/[slug]/nodes/[nodeSlug]/NodeTabs";
import { WorldRulesTab } from "./WorldRulesTab";
import { WorldRecentChangesTab } from "./WorldRecentChangesTab";
import { WorldSidebar } from "./WorldSidebar";
import { WorldQuickBar } from "./WorldQuickBar";
import { WorldAnnouncementsSection } from "./WorldAnnouncementsSection";
import { unwrapRelation } from "@/lib/unwrapRelation";

const RECENT_CHANGES_LIMIT = 8;

/**
 * 分頁標題/分享預覽卡(og:title/description/image)——標題交給 root
 * layout 的 title.template 補上「｜ Heldendicht」。og:image 只有公開
 * 世界觀才簽(見 getWorldOgImageUrl 的說明),非公開世界觀/沒設定橫幅
 * 就不帶圖,交給分享平台自己的預設樣式。
 */
export async function generateMetadata({
  params,
}: PageProps<"/worlds/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: world } = await supabase
    .from("worlds")
    .select("name, tagline, description, banner_path, is_public")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) return {};

  const description = world.tagline || world.description || undefined;
  const ogImage =
    world.is_public && world.banner_path
      ? await getWorldOgImageUrl(world.banner_path)
      : null;

  return {
    title: world.name,
    description,
    openGraph: {
      title: world.name,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function WorldPage({
  params,
}: PageProps<"/worlds/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

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
  // 電腦版把「世界導讀/企劃規則與手冊/近期變更」收回同一頁用 client tab
  // 切換(維持改版前的做法)。「條目目錄」這份內容已經併入「世界觀百科」
  // (/directory 路由),不在這裡重複撈一次分類/關係線資料。
  const [
    { data: nodes },
    { data: worldRules },
    { data: recentNodes },
    { data: firstMapLayer },
    { data: announcements },
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
      supabase
        .from("world_announcements")
        .select("id, title, content, created_at, updated_at")
        .eq("world_id", world.id)
        .order("created_at", { ascending: false }),
      getWorldMediaSignedUrl(world.banner_path),
      getWorldMediaSignedUrl(world.icon_path),
    ]);

  const mapPreviewUrl = firstMapLayer ? await getWorldMapSignedUrl(firstMapLayer.image_path) : null;

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

  const descriptionContent = world.description ? (
    <p className="max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
      {world.description}
    </p>
  ) : (
    <EmptyState title="這個世界觀還沒有介紹文字" description="主辦還沒有寫下這個世界觀的導讀。" />
  );

  const announcementsContent = (
    <WorldAnnouncementsSection announcements={announcements ?? []} />
  );

  const overviewTabContent = (
    <div className="flex flex-col gap-4">
      {descriptionContent}
      {announcementsContent}
      {mapPreviewUrl && (
        <Link
          href={`/worlds/${slug}/worldmap`}
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
      key: "recent",
      label: "近期變更",
      content: <WorldRecentChangesTab nodes={recentNodes} basePath={`/worlds/${slug}/nodes`} />,
    },
    { key: "rules", label: "規則", content: <WorldRulesTab worldRules={worldRules} /> },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
      <WorldHero name={world.name} tagline={world.tagline} bannerUrl={bannerUrl} iconUrl={iconUrl} />

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

        <WorldQuickBar worldSlug={slug} isLoggedIn={Boolean(user)} />
      </div>

      {/* 電腦版把這幾個數字挪回側邊欄用文字列呈現,這裡的卡片只在手機版顯示。 */}
      <div className="mt-6 lg:hidden">
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

          {announcementsContent}

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
        <div className="lg:order-2 lg:col-span-3">
          <WorldSidebar
            ownerLabel={owner?.display_name || owner?.username || null}
            defaultPcQuota={world.default_pc_quota}
            navMenu={
              <>
                <Link href={`/worlds/${slug}/directory`} className="hover:underline">
                  世界觀百科
                </Link>
                <Link href={`/worlds/${slug}/story`} className="hover:underline">
                  故事時間軸
                </Link>
                <Link href={`/worlds/${slug}/map`} className="hover:underline">
                  關係圖譜
                </Link>
                <Link href={`/worlds/${slug}/worldmap`} className="hover:underline">
                  世界地圖
                </Link>
              </>
            }
            footerNote="對特定節點或關係線有疑慮嗎?到該節點/關係線自己的頁面可以個別檢舉,主辦會盡快處理。"
          />
        </div>

        <div className="lg:order-1 lg:col-span-9 lg:min-w-0">
          <NodeTabs tabs={desktopTabs} syncParam="tab" />
        </div>
      </div>
    </div>
  );
}
