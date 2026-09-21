import Link from "next/link";
import { requireUser, getCurrentProfile } from "@/lib/dal";
import { logout } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import {
  NotificationBell,
  type NotificationItem,
  type ReviewWorldSummary,
} from "./NotificationBell";
import { unwrapRelation } from "@/lib/unwrapRelation";

// /dashboard 底下都需要登入。proxy.ts 已經做了一次「優化用」的導向,
// 這裡是真正的檢查點 —— 沒登入會被 requireUser() 導去 /login。
export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: notifRows }, { count: unreadCount }, { data: staffMemberships }] =
    await Promise.all([
      supabase
        .from("notifications")
        .select(
          "id, type, is_read, created_at, actor:profiles!notifications_actor_id_fkey(username, display_name, email), node:nodes(title, slug), world:worlds(slug, name)",
        )
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false),
      supabase
        .from("world_memberships")
        .select("world_id, world:worlds(slug, name)")
        .eq("user_id", user.id)
        .in("role", ["admin", "editor"]),
    ]);

  const notifications: NotificationItem[] = (notifRows ?? []).map((n) => {
    const actor = unwrapRelation(n.actor);
    const node = unwrapRelation(n.node);
    const world = unwrapRelation(n.world);
    return {
      id: n.id,
      type: n.type,
      isRead: n.is_read,
      createdAt: n.created_at,
      actorLabel: actor?.display_name || actor?.username || actor?.email || "有人",
      actorUsername: actor?.username ?? null,
      nodeTitle: node?.title ?? null,
      nodeSlug: node?.slug ?? null,
      worldSlug: world?.slug ?? null,
      worldName: world?.name ?? null,
    };
  });

  // 待審核節點/未結案檢舉按世界觀分開統計,而不是像過去的 staff_review_summary()
  // RPC 那樣回傳一個跨世界觀的總數 —— 通知鈴鐺才有辦法標示每筆審核提示來自哪個世界觀。
  const staffWorlds = (staffMemberships ?? [])
    .map((m) => {
      const world = unwrapRelation(m.world);
      return world ? { id: m.world_id, slug: world.slug, name: world.name } : null;
    })
    .filter((w): w is { id: string; slug: string; name: string } => w !== null);

  const reviewSummaries: ReviewWorldSummary[] = [];
  if (staffWorlds.length > 0) {
    const staffWorldIds = staffWorlds.map((w) => w.id);
    const [{ data: nodeRows }, { data: relRows }] = await Promise.all([
      supabase.from("nodes").select("id, world_id, status").in("world_id", staffWorldIds),
      supabase.from("relationships").select("id, world_id").in("world_id", staffWorldIds),
    ]);

    // reports.target_id 是多型欄位,沒有真正的外鍵可以直接 embed 世界觀,
    // 所以跟 worlds/[slug]/reports/page.tsx 一樣,先建節點/關係線 id -> world_id 的對照表。
    const nodeWorldMap = new Map((nodeRows ?? []).map((n) => [n.id, n.world_id]));
    const relWorldMap = new Map((relRows ?? []).map((r) => [r.id, r.world_id]));
    const nodeIds = [...nodeWorldMap.keys()];
    const relIds = [...relWorldMap.keys()];

    const [{ data: nodeReports }, { data: relReports }] = await Promise.all([
      nodeIds.length > 0
        ? supabase
            .from("reports")
            .select("target_id")
            .eq("target_type", "node")
            .eq("status", "open")
            .in("target_id", nodeIds)
        : Promise.resolve({ data: [] }),
      relIds.length > 0
        ? supabase
            .from("reports")
            .select("target_id")
            .eq("target_type", "relationship")
            .eq("status", "open")
            .in("target_id", relIds)
        : Promise.resolve({ data: [] }),
    ]);

    const pendingCountByWorld = new Map<string, number>();
    for (const n of nodeRows ?? []) {
      if (n.status === "pending") {
        pendingCountByWorld.set(n.world_id, (pendingCountByWorld.get(n.world_id) ?? 0) + 1);
      }
    }
    const openReportCountByWorld = new Map<string, number>();
    for (const r of nodeReports ?? []) {
      const worldId = nodeWorldMap.get(r.target_id);
      if (worldId) {
        openReportCountByWorld.set(worldId, (openReportCountByWorld.get(worldId) ?? 0) + 1);
      }
    }
    for (const r of relReports ?? []) {
      const worldId = relWorldMap.get(r.target_id);
      if (worldId) {
        openReportCountByWorld.set(worldId, (openReportCountByWorld.get(worldId) ?? 0) + 1);
      }
    }

    for (const w of staffWorlds) {
      const pendingNodesCount = pendingCountByWorld.get(w.id) ?? 0;
      const openReportsCount = openReportCountByWorld.get(w.id) ?? 0;
      if (pendingNodesCount > 0 || openReportsCount > 0) {
        reviewSummaries.push({
          worldSlug: w.slug,
          worldName: w.name,
          pendingNodesCount,
          openReportsCount,
        });
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold tracking-wide">
              Heldendicht
            </span>
            <span className="text-xs text-muted-foreground">後台</span>
          </span>
          <div className="flex items-center gap-4 text-sm">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount ?? 0}
              reviewSummaries={reviewSummaries}
            />
            <Link href="/dashboard/messages" className="hover:underline">
              私訊
            </Link>
            <Link href="/dashboard/profile" className="hover:underline">
              {profile?.display_name ?? profile?.email}
            </Link>
            <form action={logout}>
              <button type="submit" className="underline">
                登出
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
