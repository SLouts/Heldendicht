import Link from "next/link";

/**
 * 個人偏好與版面設定——未讀通知/私訊概覽入口,都是 Server Component
 * 直接算好傳進來。
 *
 * 「一般通知」(追蹤動態)跟「待審核」(節點審核+檢舉)分開顯示兩行——
 * 之前這裡只顯示 notifications 表的未讀數,跟頁首通知鈴鐺的角標數字
 * (未讀通知+待審核項目加總)不一致,會讓人誤以為兩邊資料來源有問題。
 * 現在兩邊都呼叫同一份 getStaffReviewSummary(見 lib/reviewSummary.ts),
 * 只是這裡進一步拆開顯示。「待撰寫」(WikiLink 自動建立、還沒補完的
 * 佔位節點)不算進待審核,另外用提示文字標出來。
 *
 * 沒有獨立的通知列表頁,要看內容一樣要用頁首的通知鈴鐺(NotificationBell)。
 */
export function DashboardPreferencesPanel({
  unreadNotificationCount,
  unreadMessageCount,
  pendingReviewCount,
  stubNodesCount,
}: {
  unreadNotificationCount: number;
  unreadMessageCount: number;
  pendingReviewCount: number;
  stubNodesCount: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 text-sm">
      <p>
        🔔 {unreadNotificationCount} 則一般通知
        <span className="ml-1 text-muted-foreground">(請看頁首通知鈴鐺)</span>
      </p>
      <p>
        📋 {pendingReviewCount} 項待審核
        <span className="ml-1 text-muted-foreground">(條目審核+檢舉,請看頁首通知鈴鐺)</span>
      </p>
      {stubNodesCount > 0 && (
        <p className="text-muted-foreground">✏️ 另有 {stubNodesCount} 個 WikiLink 待撰寫條目</p>
      )}
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
