import Link from "next/link";
import { requireUser, getCurrentProfile } from "@/lib/dal";
import { logout } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell, type NotificationItem } from "./NotificationBell";

// /dashboard 底下都需要登入。proxy.ts 已經做了一次「優化用」的導向,
// 這裡是真正的檢查點 —— 沒登入會被 requireUser() 導去 /login。
export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  await requireUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: notifRows }, { count: unreadCount }, { data: reviewSummaryRows }] =
    await Promise.all([
      supabase
        .from("notifications")
        .select(
          "id, type, is_read, created_at, actor:profiles!notifications_actor_id_fkey(username, display_name, email), node:nodes(title, slug), world:worlds(slug)",
        )
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false),
      supabase.rpc("staff_review_summary"),
    ]);

  const notifications: NotificationItem[] = (notifRows ?? []).map((n) => {
    const actor = Array.isArray(n.actor) ? n.actor[0] : n.actor;
    const node = Array.isArray(n.node) ? n.node[0] : n.node;
    const world = Array.isArray(n.world) ? n.world[0] : n.world;
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
    };
  });

  const reviewSummary = reviewSummaryRows?.[0];
  const reviewCount =
    (reviewSummary?.pending_nodes_count ?? 0) + (reviewSummary?.open_reports_count ?? 0);

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
            {reviewCount > 0 && (
              <Link
                href="/dashboard"
                className="rounded-full bg-badge-pending-bg px-2.5 py-1 text-xs font-medium text-badge-pending-fg hover:opacity-80"
              >
                {reviewCount} 項須審核
              </Link>
            )}
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount ?? 0}
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
