import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";
import { ResolveWorldDeletionForm } from "./ResolveWorldDeletionForm";

export default async function WorldDeletionRequestsPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");

  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">世界觀刪除申請</h1>
      </div>
    );
  }

  const { data: requests } = await supabase
    .from("world_deletion_requests")
    .select(
      "id, world_slug, world_name, reason, status, created_at, requester:profiles!world_deletion_requests_requested_by_fkey(display_name, username, email)",
    )
    .order("created_at", { ascending: false });

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const resolved = requests?.filter((r) => r.status !== "pending") ?? [];

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">世界觀刪除申請</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        核准後會在同一個交易裡直接刪除該世界觀,無法復原,請謹慎確認。
      </p>

      <h2 className="mt-6 text-lg font-semibold">待審核</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {pending.map((r) => {
          const requester = unwrapRelation(r.requester);
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <div className="text-sm">
                <p className="font-medium">{r.world_name}</p>
                <p className="text-xs text-muted-foreground">
                  slug:{r.world_slug} · 申請人:
                  {requester?.display_name || requester?.username || requester?.email || "未知"}
                  {" · "}
                  {new Date(r.created_at).toLocaleString("zh-TW")}
                </p>
                {r.reason && <p className="mt-1 whitespace-pre-wrap">{r.reason}</p>}
              </div>
              <ResolveWorldDeletionForm requestId={r.id} />
            </li>
          );
        })}
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground">目前沒有待審核的申請。</p>
        )}
      </ul>

      {resolved.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">已處理</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {resolved.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <span className="font-medium">{r.world_name}</span>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs " +
                    (r.status === "approved"
                      ? "bg-badge-success-bg text-badge-success-fg"
                      : "bg-badge-neutral-bg text-badge-neutral-fg")
                  }
                >
                  {r.status === "approved" ? "已核准(已刪除)" : "已駁回"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
      ← 回後台首頁
    </Link>
  );
}
