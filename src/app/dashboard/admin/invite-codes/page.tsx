import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { deleteInviteCode } from "@/lib/actions/inviteCodes";
import { CreateInviteCodeForm } from "./CreateInviteCodeForm";

export default async function InviteCodesPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");

  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">邀請碼管理</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          只有站務(site_admin)可以管理邀請碼。
        </p>
      </div>
    );
  }

  const { data: codes } = await supabase
    .from("invite_codes")
    .select(
      "id, code, max_uses, use_count, expires_at, created_at, profiles(display_name, username, email)",
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">邀請碼管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        本站採邀請碼制註冊,只有站務能建立邀請碼。
      </p>

      <CreateInviteCodeForm />

      <ul className="mt-6 flex flex-col gap-2">
        {codes?.map((c) => {
          const creator = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
          const exhausted = c.use_count >= c.max_uses;
          const expired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
          return (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <span className="font-mono text-sm">{c.code}</span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-xs " +
                  (exhausted || expired
                    ? "bg-badge-neutral-bg text-badge-neutral-fg"
                    : "bg-badge-success-bg text-badge-success-fg")
                }
              >
                {exhausted ? "已用完" : expired ? "已過期" : "可使用"}
              </span>
              <span className="text-xs text-muted-foreground">
                已用 {c.use_count} / {c.max_uses}
                {c.expires_at &&
                  ` · 到期:${new Date(c.expires_at).toLocaleDateString("zh-TW")}`}
                {" · 建立者:"}
                {creator?.display_name || creator?.username || creator?.email || "未知"}
              </span>
              {c.use_count === 0 && (
                <form action={deleteInviteCode.bind(null, c.id)} className="ml-auto">
                  <button type="submit" className="text-sm text-danger underline">
                    刪除
                  </button>
                </form>
              )}
            </li>
          );
        })}
        {codes?.length === 0 && (
          <p className="text-sm text-muted-foreground">目前還沒有邀請碼。</p>
        )}
      </ul>
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
