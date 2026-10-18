import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";

export const metadata: Metadata = { title: "全站世界觀列表" };

/**
 * 全站世界觀列表——給站務一次看到所有世界觀(含非公開),跟 /worlds
 * 公開列表不同:這裡不受 is_public 限制,是 site_admin 專用的總覽。
 */
export default async function AdminWorldsPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");

  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">全站世界觀列表</h1>
      </div>
    );
  }

  const { data: worlds } = await supabase
    .from("worlds")
    .select(
      "id, slug, name, is_public, is_solo, created_at, profiles!worlds_owner_id_fkey(display_name, username, email)",
    )
    .order("created_at", { ascending: false });

  const worldIds = (worlds ?? []).map((w) => w.id);
  const [{ data: nodeRows }, { data: memberRows }] = await Promise.all([
    worldIds.length > 0
      ? supabase.from("nodes").select("world_id").in("world_id", worldIds).eq("is_placeholder", false)
      : Promise.resolve({ data: [] as { world_id: string }[] }),
    worldIds.length > 0
      ? supabase.from("world_memberships").select("world_id").in("world_id", worldIds)
      : Promise.resolve({ data: [] as { world_id: string }[] }),
  ]);
  const nodeCountByWorld = new Map<string, number>();
  for (const n of nodeRows ?? []) {
    nodeCountByWorld.set(n.world_id, (nodeCountByWorld.get(n.world_id) ?? 0) + 1);
  }
  const memberCountByWorld = new Map<string, number>();
  for (const m of memberRows ?? []) {
    memberCountByWorld.set(m.world_id, (memberCountByWorld.get(m.world_id) ?? 0) + 1);
  }

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">全站世界觀列表</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        共 {worlds?.length ?? 0} 個世界觀(含非公開)。
      </p>

      <ul className="mt-6 flex flex-col gap-2">
        {worlds?.map((w) => {
          const owner = unwrapRelation(w.profiles);
          return (
            <li
              key={w.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
            >
              <Link href={`/dashboard/worlds/${w.slug}`} className="font-medium hover:underline">
                {w.name}
              </Link>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-xs " +
                  (w.is_public
                    ? "bg-badge-info-bg text-badge-info-fg"
                    : "bg-badge-neutral-bg text-badge-neutral-fg")
                }
              >
                {w.is_public ? "公開" : "私人"}
              </span>
              {w.is_solo && (
                <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
                  個人寫作
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {nodeCountByWorld.get(w.id) ?? 0} 條目 ・ {memberCountByWorld.get(w.id) ?? 0} 成員 ・ 主辦:
                {owner?.display_name || owner?.username || owner?.email || "未知"} ・ 建立於{" "}
                {new Date(w.created_at).toLocaleDateString("zh-TW")}
              </span>
            </li>
          );
        })}
        {worlds?.length === 0 && (
          <li className="text-sm text-muted-foreground">目前還沒有任何世界觀。</li>
        )}
      </ul>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/admin" className="text-sm text-muted-foreground hover:underline">
      ← 回站務首頁
    </Link>
  );
}
