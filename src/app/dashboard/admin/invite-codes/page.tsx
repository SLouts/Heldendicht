import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { deleteInviteCode } from "@/lib/actions/inviteCodes";
import { CreateInviteCodeForm } from "./CreateInviteCodeForm";
import { unwrapRelation } from "@/lib/unwrapRelation";

export default async function InviteCodesPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");

  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">邀請碼管理</h1>
      </div>
    );
  }

  const { data: codes } = await supabase
    .from("invite_codes")
    .select(
      "id, code, max_uses, use_count, expires_at, created_at, profiles(display_name, username, email)",
    )
    .order("created_at", { ascending: false });

  const codeIds = (codes ?? []).map((c) => c.id);
  const { data: redemptions } =
    codeIds.length > 0
      ? await supabase
          .from("invite_code_redemptions")
          .select(
            "invite_code_id, redeemed_at, user:profiles!invite_code_redemptions_user_id_fkey(display_name, username, email)",
          )
          .in("invite_code_id", codeIds)
          .order("redeemed_at", { ascending: true })
      : { data: [] };

  const redeemersByCode = new Map<
    string,
    { label: string; redeemedAt: string }[]
  >();
  for (const r of redemptions ?? []) {
    const user = unwrapRelation(r.user);
    const label = user?.display_name || user?.username || user?.email || "未知使用者";
    const list = redeemersByCode.get(r.invite_code_id) ?? [];
    list.push({ label, redeemedAt: r.redeemed_at });
    redeemersByCode.set(r.invite_code_id, list);
  }

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">邀請碼管理</h1>

      <CreateInviteCodeForm />

      <ul className="mt-6 flex flex-col gap-2">
        {codes?.map((c) => {
          const creator = unwrapRelation(c.profiles);
          const exhausted = c.use_count >= c.max_uses;
          const expired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
          const redeemers = redeemersByCode.get(c.id) ?? [];
          return (
            <li
              key={c.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex flex-wrap items-center gap-3">
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
              </div>
              {redeemers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  使用者:
                  {redeemers
                    .map((r) => `${r.label}(${new Date(r.redeemedAt).toLocaleDateString("zh-TW")})`)
                    .join("、")}
                </p>
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
    <Link href="/dashboard/admin" className="text-sm text-muted-foreground hover:underline">
      ← 回站務首頁
    </Link>
  );
}
