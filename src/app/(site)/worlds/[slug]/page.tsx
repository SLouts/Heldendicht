import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorldMediaSignedUrl } from "@/lib/worldMedia";
import { WorldHero } from "@/app/dashboard/worlds/[slug]/WorldHero";
import { WorldStatCards } from "@/app/dashboard/worlds/[slug]/WorldStatCards";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { WorldRulesTab } from "./WorldRulesTab";
import { WorldRecentChangesTab } from "./WorldRecentChangesTab";
import { WorldQuickBar } from "./WorldQuickBar";
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
  const [{ data: nodes }, { data: worldRules }, { data: recentNodes }, bannerUrl, iconUrl] =
    await Promise.all([
      supabase
        .from("nodes")
        .select("id, node_type, edit_mode, characters(character_type)")
        .eq("world_id", world.id),
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

      <div className="mt-8">
        <WorldMainTabs basePath={`/worlds/${slug}`} />
      </div>

      <div className="mt-6 flex flex-col gap-8">
        {world.description ? (
          <p className="max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
            {world.description}
          </p>
        ) : (
          <EmptyState
            title="這個世界觀還沒有介紹文字"
            description="主辦還沒有寫下這個世界觀的導讀。"
          />
        )}

        <WorldRulesTab worldRules={worldRules} />

        <WorldRecentChangesTab nodes={recentNodes} basePath={`/worlds/${slug}/nodes`} />

        <p className="text-xs text-muted-foreground">
          對特定節點或關係線有疑慮嗎?到該節點/關係線自己的頁面可以個別檢舉,主辦會盡快處理。
        </p>
      </div>
    </div>
  );
}
