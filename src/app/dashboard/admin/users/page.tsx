import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { unsuspendUser } from "@/lib/actions/adminUsers";
import { SuspendUserForm } from "./SuspendUserForm";
import type { SiteRole } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "使用者管理" };

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  created_at: string;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  site_role: SiteRole;
};

const SELECT =
  "id, username, display_name, email, created_at, is_suspended, suspended_at, suspended_reason, site_role";

/**
 * 使用者搜尋——分開查 username/display_name/email 三個欄位再合併去重,
 * 不要把使用者輸入直接組進 PostgREST 的 .or() 字串語法(理由同
 * adminResetUserPassword:那個語法的保留字元可能被使用者輸入裡的
 * `,`/`.` 等字元竄改查詢條件)。
 */
export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/dashboard/admin/users">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const currentUser = await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");
  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">使用者管理</h1>
      </div>
    );
  }

  let users: ProfileRow[];
  if (q) {
    const [byUsername, byDisplayName, byEmail] = await Promise.all([
      supabase.from("profiles").select(SELECT).ilike("username", `%${q}%`),
      supabase.from("profiles").select(SELECT).ilike("display_name", `%${q}%`),
      supabase.from("profiles").select(SELECT).ilike("email", `%${q}%`),
    ]);
    const byId = new Map<string, ProfileRow>();
    for (const row of [
      ...(byUsername.data ?? []),
      ...(byDisplayName.data ?? []),
      ...(byEmail.data ?? []),
    ]) {
      byId.set(row.id, row);
    }
    users = [...byId.values()];
  } else {
    const { data } = await supabase
      .from("profiles")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(50);
    users = data ?? [];
  }

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">使用者管理</h1>

      <form className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜尋使用者名稱、顯示名稱或 Email"
          className="w-72 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover">
          搜尋
        </button>
      </form>
      {!q && (
        <p className="mt-2 text-xs text-muted-foreground">
          目前顯示最近註冊的 50 位使用者,輸入關鍵字可搜尋全部使用者。
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.id} className="rounded-lg border border-border bg-surface p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{u.display_name || u.username || "(未設定名稱)"}</span>
              {u.username && <span className="text-xs text-muted-foreground">@{u.username}</span>}
              {u.is_suspended && (
                <span className="rounded-full bg-danger px-2 py-0.5 text-xs text-danger-foreground">
                  已停權
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {u.email ?? "(無 Email)"} ・ 註冊於 {new Date(u.created_at).toLocaleDateString("zh-TW")}
            </p>
            {u.is_suspended && u.suspended_reason && (
              <p className="mt-1 text-xs text-muted-foreground">停權原因:{u.suspended_reason}</p>
            )}

            <div className="mt-2">
              {u.is_suspended ? (
                <form action={unsuspendUser.bind(null, u.id, "/dashboard/admin/users")}>
                  <button className="rounded-lg bg-success px-3 py-1.5 text-xs text-success-foreground transition hover:bg-success-hover">
                    解除停權
                  </button>
                </form>
              ) : u.id === currentUser.id ? (
                <p className="text-xs text-muted-foreground">不能把自己停權</p>
              ) : (
                <SuspendUserForm
                  userId={u.id}
                  revalidatePathStr="/dashboard/admin/users"
                  isTargetSiteAdmin={u.site_role === "site_admin"}
                />
              )}
            </div>
          </li>
        ))}
        {users.length === 0 && (
          <li className="text-sm text-muted-foreground">找不到符合條件的使用者。</li>
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
