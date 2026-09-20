import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { RecentActivityList, type RecentActivityItem } from "./RecentActivityList";
import { PlatformFeatures } from "./PlatformFeatures";

/**
 * 首頁——平台概覽與動態樞紐,不重複維護 /worlds 那份完整的世界觀卡片
 * 網格,只負責:Hero 導引、全站最新動態、平台特色介紹、註冊 CTA。
 *
 * 不需要登入就能看——「全站最新動態」故意只抓 is_public 世界觀底下的
 * 節點,不透過一般的 RLS-gated 可見度(那會因為訪客是不是某個私人世界觀
 * 成員而顯示不同內容),讓這份「全站」動態對每個人都一樣。
 */
export default async function Home() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: recentNodes } = await supabase
    .from("nodes")
    .select(
      "id, title, slug, node_type, updated_at, creator_id, world:worlds!inner(name, slug, is_public)",
    )
    .eq("world.is_public", true)
    .eq("status", "approved")
    .eq("is_placeholder", false)
    .order("updated_at", { ascending: false })
    .limit(6);

  const nodeIds = (recentNodes ?? []).map((n) => n.id);

  // 找每個節點「最後一次被誰更新」——node_revisions 是 trigger 在每次
  // UPDATE 前自動存的舊版快照,editor_id 就是觸發這次更新的人;同一個
  // node_id 取 created_at 最新的一筆即可。從來沒被編輯過(只有建立時的
  // 那一版)的節點不會有任何 revision,這時就落回 creator_id。
  const { data: revisions } =
    nodeIds.length > 0
      ? await supabase
          .from("node_revisions")
          .select("node_id, editor_id, created_at")
          .in("node_id", nodeIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const lastEditorByNode = new Map<string, string>();
  for (const r of revisions ?? []) {
    if (!lastEditorByNode.has(r.node_id)) {
      lastEditorByNode.set(r.node_id, r.editor_id);
    }
  }

  const updaterIds = [
    ...new Set(
      (recentNodes ?? []).map((n) => lastEditorByNode.get(n.id) ?? n.creator_id),
    ),
  ];
  const { data: updaterProfiles } =
    updaterIds.length > 0
      ? await supabase.from("profiles").select("id, username, display_name").in("id", updaterIds)
      : { data: [] };
  const profileById = new Map((updaterProfiles ?? []).map((p) => [p.id, p]));

  const recentActivity: RecentActivityItem[] = (recentNodes ?? []).map((node) => {
    const world = Array.isArray(node.world) ? node.world[0] : node.world;
    const updaterId = lastEditorByNode.get(node.id) ?? node.creator_id;
    const updater = profileById.get(updaterId);
    return {
      id: node.id,
      title: node.title,
      nodeSlug: node.slug,
      nodeType: node.node_type,
      worldName: world?.name ?? "",
      worldSlug: world?.slug ?? "",
      updaterLabel: updater?.username || updater?.display_name || "匿名玩家",
      updatedAt: node.updated_at,
    };
  });

  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <section className="py-8 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            編織架空宇宙,記錄英雄敘事
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            跟其他玩家一起建立世界觀、經營角色,把設定跟故事留在同一個地方。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/worlds"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
            >
              探索公開世界觀
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-surface"
              >
                前往工作台
              </Link>
            ) : (
              <Link
                href="/signup"
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-surface"
              >
                註冊帳號
              </Link>
            )}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">全站最新動態</h2>
          <RecentActivityList items={recentActivity} />
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">平台特色</h2>
          <PlatformFeatures />
        </section>

        <section className="mt-12 rounded-lg border border-border bg-surface p-8 text-center">
          <h2 className="text-2xl font-semibold">加入這裡,開始寫下你的故事</h2>
          <p className="mt-2 text-muted-foreground">
            {user
              ? "建立一個新的世界觀,或去找一個喜歡的世界觀投稿角色。"
              : "註冊帳號,建立世界觀或加入別人的企劃,把設定跟角色寫進共筆世界。"}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link
                href="/dashboard/worlds/new"
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
              >
                建立新的世界觀
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
                >
                  註冊帳號
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-surface"
                >
                  已有帳號?登入
                </Link>
              </>
            )}
          </div>
        </section>

        <footer className="mt-16 border-t border-border pt-8 pb-4 text-center text-sm text-muted-foreground">
          <p>目前為測試營運階段,請創作者自行保留備份,以免資料異動造成損失。</p>
          <p className="mt-2">
            站務信箱:
            <a
              href="mailto:heldendicht.cit@gmail.com"
              className="ml-1 underline underline-offset-2 hover:text-foreground"
            >
              heldendicht.cit@gmail.com
            </a>
          </p>
          <Link
            href="/rules"
            className="mt-4 inline-block rounded-lg border border-border px-4 py-1.5 text-xs transition hover:bg-surface"
          >
            查看全站規則
          </Link>
        </footer>
      </main>
    </div>
  );
}
