import Link from "next/link";
import { requireUser, getCurrentProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getProfileMediaPublicUrl } from "@/lib/profileMedia";
import { DashboardIdentityCard } from "./DashboardIdentityCard";
import { DashboardPreferencesPanel } from "./DashboardPreferencesPanel";
import { DashboardWorldsSection, type DashboardWorldItem } from "./DashboardWorldsSection";

/**
 * 工作台首頁動線:先個人身分資訊、版面偏好,再進入世界觀選擇——不是一
 * 進來就直接丟一串世界觀清單。三個區塊都是 Server Component 直接 SSR,
 * 唯一的例外是 CurrentThemeBadge(見該檔案說明,主題狀態只存在瀏覽器)。
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    profile,
    { data: memberships },
    { count: unreadNotificationCount },
    { count: unreadMessageCount },
    { data: isSiteAdmin },
  ] = await Promise.all([
    getCurrentProfile(),
    // RLS 的 memberships_select policy 已經保證這裡只會拿到自己的成員資格,
    // 不需要再手動加一次 .eq("user_id", user.id)。多 select owner_id 用來
    // 分辨「我發起的」跟「我參與的」——建立世界觀時會自動幫 owner 建一筆
    // role='admin' 的 membership(見 schema.sql 的 trigger),所以不用另外
    // 查 worlds.owner_id = user.id,world_memberships 本身就涵蓋所有情況。
    supabase
      .from("world_memberships")
      .select("role, worlds(id, slug, name, owner_id)")
      .eq("user_id", user.id),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false),
    supabase
      .from("direct_messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
    supabase.rpc("is_site_admin"),
  ]);

  const avatarUrl = getProfileMediaPublicUrl(profile?.avatar_path ?? null);

  const ownedWorlds: DashboardWorldItem[] = [];
  const joinedWorlds: DashboardWorldItem[] = [];
  for (const m of memberships ?? []) {
    const world = Array.isArray(m.worlds) ? m.worlds[0] : m.worlds;
    if (!world) continue;
    const item: DashboardWorldItem = { id: world.id, slug: world.slug, name: world.name, role: m.role };
    if (world.owner_id === user.id) {
      ownedWorlds.push(item);
    } else {
      joinedWorlds.push(item);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardIdentityCard
            displayName={profile?.display_name ?? null}
            username={profile?.username ?? null}
            email={profile?.email ?? null}
            avatarUrl={avatarUrl}
          />
        </div>
        <DashboardPreferencesPanel
          unreadNotificationCount={unreadNotificationCount ?? 0}
          unreadMessageCount={unreadMessageCount ?? 0}
        />
      </div>

      <DashboardWorldsSection ownedWorlds={ownedWorlds} joinedWorlds={joinedWorlds} />

      {isSiteAdmin && (
        <p className="text-sm text-muted-foreground">
          站務工具:
          <Link href="/dashboard/admin/invite-codes" className="ml-1 underline">
            邀請碼管理
          </Link>
          <Link href="/dashboard/admin/reset-password" className="ml-3 underline">
            手動重設密碼
          </Link>
          <Link href="/dashboard/admin/rules" className="ml-3 underline">
            全站規則
          </Link>
        </p>
      )}
    </div>
  );
}
