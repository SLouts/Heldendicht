import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * 站務功能集中入口——原本這 5 個連結散在 /dashboard 首頁最下面一段
 * 純文字裡,跟一般成員也會用的導覽混在一起,站務容易找不到。這裡只是
 * 把連結收攏成一頁,不是新的權限系統——每個子頁面自己仍然各自做
 * is_site_admin() 檢查,真正的權限邊界還是各自資料表的 RLS policy。
 */
export default async function SiteAdminPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");

  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">站務</h1>
        <p className="mt-2 text-sm text-muted-foreground">只有站務管理員能使用這些功能。</p>
      </div>
    );
  }

  const links = [
    {
      href: "/dashboard/admin/homepage",
      label: "首頁內容",
      description: "編輯首頁標題、標語、測試版公告文字",
    },
    {
      href: "/dashboard/admin/rules",
      label: "全站規則",
      description: "投稿或使用本站要遵守的規定、授權或權利聲明",
    },
    {
      href: "/dashboard/admin/invite-codes",
      label: "邀請碼管理",
      description: "建立/刪除註冊邀請碼",
    },
    {
      href: "/dashboard/admin/world-deletion-requests",
      label: "世界觀刪除申請",
      description: "審核主辦提出的世界觀刪除申請",
    },
    {
      href: "/dashboard/admin/reset-password",
      label: "手動重設密碼",
      description: "協助使用者重設帳號密碼",
    },
  ];

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">站務</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg border border-border bg-surface p-4 transition hover:bg-muted"
          >
            <p className="font-display text-sm font-medium">{l.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l.description}</p>
          </Link>
        ))}
      </div>
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
