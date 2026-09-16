import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // RLS 的 memberships_select policy 已經保證這裡只會拿到自己的成員資格,
  // 不需要再手動加一次 .eq("user_id", user.id)。
  const [{ data: memberships }, { data: isSiteAdmin }] = await Promise.all([
    supabase
      .from("world_memberships")
      .select("role, worlds(id, slug, name)")
      .eq("user_id", user.id),
    supabase.rpc("is_site_admin"),
  ]);

  // 每個世界觀卡片旁邊直接標出「待審核節點數」,讓 staff/admin 一眼看到
  // 哪個世界觀需要處理,不用逐一點進去才知道——只查自己是 admin/editor
  // 的世界觀,一般 member 不需要看到這個數字。
  const staffWorldIds = (memberships ?? [])
    .filter((m) => m.role === "admin" || m.role === "editor")
    .map((m) => (Array.isArray(m.worlds) ? m.worlds[0]?.id : m.worlds?.id))
    .filter((id): id is string => Boolean(id));

  const { data: pendingNodeRows } =
    staffWorldIds.length > 0
      ? await supabase
          .from("nodes")
          .select("world_id")
          .eq("status", "pending")
          .in("world_id", staffWorldIds)
      : { data: [] as { world_id: string }[] };

  const pendingCounts = new Map<string, number>();
  for (const row of pendingNodeRows ?? []) {
    pendingCounts.set(row.world_id, (pendingCounts.get(row.world_id) ?? 0) + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的世界觀</h1>
        <Link
          href="/dashboard/worlds/new"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover"
        >
          + 建立世界觀
        </Link>
      </div>

      <div className="mt-6 grid gap-3">
        {memberships?.map((m) => {
          const world = Array.isArray(m.worlds) ? m.worlds[0] : m.worlds;
          if (!world) return null;
          const pendingCount = pendingCounts.get(world.id) ?? 0;
          return (
            <Link
              key={world.id}
              href={`/dashboard/worlds/${world.slug}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-primary/50"
            >
              <span className="font-medium">{world.name}</span>
              <span className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <span className="rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg">
                    {pendingCount} 待審核
                  </span>
                )}
                <span className="text-sm text-muted-foreground">{m.role}</span>
              </span>
            </Link>
          );
        })}
        {memberships?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            你還沒有加入任何世界觀,請聯絡世界觀主辦邀請你加入。
          </p>
        )}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        想先了解節點頁面的附件/嵌入圖片怎麼運作?
        <Link href="/dashboard/demo/attachments" className="ml-1 underline">
          看看互動示範
        </Link>
      </p>

      {isSiteAdmin && (
        <p className="mt-2 text-sm text-muted-foreground">
          站務工具:
          <Link href="/dashboard/admin/invite-codes" className="ml-1 underline">
            邀請碼管理
          </Link>
        </p>
      )}
    </div>
  );
}
