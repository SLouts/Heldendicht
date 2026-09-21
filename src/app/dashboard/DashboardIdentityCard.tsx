import Link from "next/link";

/**
 * 工作台首頁最上方的個人身分資訊卡——純顯示,沒有互動,不需要 "use client"。
 * 編輯資料(頭貼/顯示名稱/密碼等)一律連去 /dashboard/profile,這裡不重複
 * 做一份表單。
 */
export function DashboardIdentityCard({
  displayName,
  username,
  email,
  avatarUrl,
}: {
  displayName: string | null;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- profile-media 是 public bucket 的公開網址,無法用 next/image 白名單網域
        <img
          src={avatarUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-full border border-border bg-background" />
      )}

      <div className="min-w-0">
        <p className="truncate font-medium">{displayName || username || "未命名玩家"}</p>
        {username && <p className="truncate text-sm text-muted-foreground">@{username}</p>}
        {email && <p className="truncate text-sm text-muted-foreground">{email}</p>}

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {username && (
            <Link href={`/u/${username}`} className="underline">
              查看公開頁面
            </Link>
          )}
          <Link href="/dashboard/profile" className="underline">
            帳號安全設定
          </Link>
        </div>
      </div>
    </div>
  );
}
