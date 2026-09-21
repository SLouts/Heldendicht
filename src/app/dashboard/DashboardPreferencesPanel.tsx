import Link from "next/link";

/**
 * 個人偏好與版面設定——未讀通知/私訊概覽入口,都是 Server Component
 * 直接算好傳進來。
 *
 * 沒有獨立的通知列表頁,「未讀通知」目前只顯示數字,不是連結——真的要看
 * 內容一樣要用頁首的通知鈴鐺(NotificationBell)。
 */
export function DashboardPreferencesPanel({
  unreadNotificationCount,
  unreadMessageCount,
}: {
  unreadNotificationCount: number;
  unreadMessageCount: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 text-sm">
      <p>
        🔔 {unreadNotificationCount} 則未讀通知
        <span className="ml-1 text-muted-foreground">(請看頁首通知鈴鐺)</span>
      </p>
      <p>
        ✉️ {unreadMessageCount} 則未讀私訊
        {unreadMessageCount > 0 && (
          <Link href="/dashboard/messages" className="ml-1 underline">
            前往私訊
          </Link>
        )}
      </p>
    </div>
  );
}
