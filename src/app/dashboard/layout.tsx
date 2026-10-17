import Link from "next/link";
import { requireUser, getCurrentProfile } from "@/lib/dal";
import { logout } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { MobileMenu } from "@/components/MobileMenu";
import { NotificationBell, type NotificationItem } from "./NotificationBell";
import { unwrapRelation } from "@/lib/unwrapRelation";
import { getStaffReviewSummary } from "@/lib/reviewSummary";

// /dashboard 底下都需要登入。proxy.ts 已經做了一次「優化用」的導向,
// 這裡是真正的檢查點 —— 沒登入會被 requireUser() 導去 /login。
export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: notifRows }, { count: unreadCount }, reviewSummary] = await Promise.all([
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
    getStaffReviewSummary(supabase, user.id),
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

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold tracking-wide">
              Heldendicht
            </span>
            <span className="text-xs text-muted-foreground">後台</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount ?? 0}
              reviewSummaries={reviewSummary.worlds}
            />
            <MobileMenu>
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
            </MobileMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
