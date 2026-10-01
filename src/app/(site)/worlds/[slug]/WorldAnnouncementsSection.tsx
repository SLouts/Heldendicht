import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { MarkdownText } from "@/components/MarkdownText";

export type WorldAnnouncement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

/**
 * 世界觀公告的唯讀顯示——世界導讀分頁裡,介紹文字(worlds.description)
 * 下面的「部落格文章清單」,照時間新到舊排序(呼叫端查詢時已經
 * order by created_at desc,這裡不重新排序)。沒有公告就完全不畫這塊
 * (不像介紹文字那樣顯示「還沒有介紹文字」的 EmptyState)——公告本來
 * 就是可有可無的補充內容,公開頁面空著比硬擠一張空卡片自然。
 */
export function WorldAnnouncementsSection({
  announcements,
}: {
  announcements: WorldAnnouncement[];
}) {
  if (announcements.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {announcements.map((a) => (
        <AnnouncementItem key={a.id} announcement={a} />
      ))}
    </div>
  );
}

export function AnnouncementItem({ announcement }: { announcement: WorldAnnouncement }) {
  const edited = announcement.updated_at !== announcement.created_at;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-display text-base font-semibold">{announcement.title}</h3>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(announcement.created_at)}
          {edited && " (已編輯)"}
        </span>
      </div>
      <div className="mt-2">
        <MarkdownText text={announcement.content} />
      </div>
    </div>
  );
}
