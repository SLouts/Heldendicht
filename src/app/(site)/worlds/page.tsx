import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getWorldMediaSignedUrls } from "@/lib/worldMedia";
import { WorldCard } from "@/components/WorldCard";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { WorldsListControls, type WorldSort } from "./WorldsListControls";

export const metadata: Metadata = {
  title: "探索公開世界觀",
  description: "瀏覽站上所有公開的世界觀企劃,找一個喜歡的世界觀投稿角色。",
  openGraph: {
    title: "探索公開世界觀",
    description: "瀏覽站上所有公開的世界觀企劃,找一個喜歡的世界觀投稿角色。",
    // 子頁面自己宣告 openGraph 會整個蓋掉 RootLayout 的預設值(不是逐欄
    // 合併),沒有自己的代表圖時要在這裡重複帶一次預設圖,不然分享連結
    // 會完全沒有預覽圖。
    images: ["/og-default.png"],
  },
};

/**
 * 公開世界觀列表——卡片補上封面/條目數/參與人數/最後更新時間,並提供
 * 搜尋跟排序。可見度完全交給 RLS(只會查到公開世界觀),這裡不用再加
 * .eq("is_public", true)。
 */
export default async function WorldsPage({
  searchParams,
}: PageProps<"/worlds">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sort: WorldSort =
    typeof sp.sort === "string" && ["updated", "newest", "nodes", "name"].includes(sp.sort)
      ? (sp.sort as WorldSort)
      : "updated";

  const supabase = await createClient();
  let worldsQuery = supabase
    .from("worlds")
    .select("id, slug, name, tagline, description, banner_path, icon_path, created_at, updated_at");
  if (q) {
    const escaped = q.replace(/[%_\\]/g, (m) => `\\${m}`);
    worldsQuery = worldsQuery.or(
      `name.ilike.%${escaped}%,tagline.ilike.%${escaped}%,description.ilike.%${escaped}%`,
    );
  }
  const { data: worlds } = await worldsQuery;
  const worldRows = worlds ?? [];
  const worldIds = worldRows.map((w) => w.id);

  const [{ data: nodeRows }, { data: memberRows }, mediaUrls] = await Promise.all([
    worldIds.length > 0
      ? supabase
          .from("nodes")
          .select("world_id, updated_at")
          .in("world_id", worldIds)
          .eq("is_placeholder", false)
      : Promise.resolve({ data: [] as { world_id: string; updated_at: string }[] }),
    worldIds.length > 0
      ? supabase.from("world_memberships").select("world_id").in("world_id", worldIds)
      : Promise.resolve({ data: [] as { world_id: string }[] }),
    getWorldMediaSignedUrls(worldRows),
  ]);

  const nodeCountByWorld = new Map<string, number>();
  const lastContentUpdateByWorld = new Map<string, string>();
  for (const n of nodeRows ?? []) {
    nodeCountByWorld.set(n.world_id, (nodeCountByWorld.get(n.world_id) ?? 0) + 1);
    const current = lastContentUpdateByWorld.get(n.world_id);
    if (!current || n.updated_at > current) {
      lastContentUpdateByWorld.set(n.world_id, n.updated_at);
    }
  }
  const memberCountByWorld = new Map<string, number>();
  for (const m of memberRows ?? []) {
    memberCountByWorld.set(m.world_id, (memberCountByWorld.get(m.world_id) ?? 0) + 1);
  }

  const enriched = worldRows.map((w, i) => {
    const nodeCount = nodeCountByWorld.get(w.id) ?? 0;
    const memberCount = memberCountByWorld.get(w.id) ?? 0;
    const lastContentUpdate = lastContentUpdateByWorld.get(w.id);
    const lastUpdatedAt =
      lastContentUpdate && lastContentUpdate > w.updated_at ? lastContentUpdate : w.updated_at;
    return {
      ...w,
      ...mediaUrls[i],
      nodeCount,
      memberCount,
      lastUpdatedAt,
    };
  });

  enriched.sort((a, b) => {
    switch (sort) {
      case "newest":
        return b.created_at.localeCompare(a.created_at);
      case "nodes":
        return b.nodeCount - a.nodeCount;
      case "name":
        return a.name.localeCompare(b.name, "zh-Hant");
      case "updated":
      default:
        return b.lastUpdatedAt.localeCompare(a.lastUpdatedAt);
    }
  });

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">探索公開世界觀</h1>
      <WorldsListControls initialQuery={q} initialSort={sort} />

      {enriched.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          {q ? "沒有找到符合的世界觀。" : "目前還沒有公開的世界觀。"}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enriched.map((world) => (
          <WorldCard
            key={world.id}
            slug={world.slug}
            name={world.name}
            tagline={world.tagline}
            bannerUrl={world.bannerUrl}
            iconUrl={world.iconUrl}
            stats={
              <>
                {world.nodeCount} 條目 ・ {world.memberCount} 參與者 ・ 最後更新{" "}
                {formatRelativeTime(world.lastUpdatedAt)}
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}
