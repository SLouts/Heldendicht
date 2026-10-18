import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";

export const metadata: Metadata = { title: "操作紀錄" };

const ACTION_LABEL: Record<string, string> = {
  reset_password: "重設密碼",
  suspend_user: "停權",
  unsuspend_user: "解除停權",
};

const TARGET_TYPE_LABEL: Record<string, string> = {
  profile: "使用者",
};

type ActorProfile = { display_name: string | null; username: string | null; email: string | null };

/**
 * 站務操作紀錄——只給 site_admin 看,純粹唯讀(staff_actions_log
 * 沒有開放 update/delete policy),顯示最近 200 筆。
 */
export default async function AdminAuditLogPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");
  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">操作紀錄</h1>
      </div>
    );
  }

  const { data: logs } = await supabase
    .from("staff_actions_log")
    .select(
      "id, target_type, target_id, action, detail, created_at, actor:profiles!staff_actions_log_actor_id_fkey(display_name, username, email)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">操作紀錄</h1>
      <p className="mt-1 text-sm text-muted-foreground">最近 200 筆站務操作紀錄。</p>

      <ul className="mt-6 flex flex-col gap-2">
        {logs?.map((log) => {
          const actor = unwrapRelation(log.actor) as ActorProfile | null;
          return (
            <li
              key={log.id}
              className="rounded-lg border border-border bg-surface p-3 text-sm"
            >
              <span className="font-medium">
                {actor?.display_name || actor?.username || actor?.email || "未知"}
              </span>{" "}
              於 {new Date(log.created_at).toLocaleString("zh-TW")}{" "}
              <span className="rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg">
                {ACTION_LABEL[log.action] ?? log.action}
              </span>{" "}
              {log.target_type && (
                <span className="text-xs text-muted-foreground">
                  目標:{TARGET_TYPE_LABEL[log.target_type] ?? log.target_type}
                  {log.target_id ? ` (${log.target_id})` : ""}
                </span>
              )}
              {log.detail && <p className="mt-1 text-xs text-muted-foreground">{log.detail}</p>}
            </li>
          );
        })}
        {(!logs || logs.length === 0) && (
          <li className="text-sm text-muted-foreground">目前沒有任何操作紀錄。</li>
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
