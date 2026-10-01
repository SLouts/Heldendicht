import Link from "next/link";

/**
 * 世界觀管理功能的連結卡片清單——電腦版當成「設定」分頁的內容
 * (page.tsx 的 desktopTabs),手機版當成 /admin 路由頁面的內容
 * (admin/page.tsx),兩邊共用同一份清單,不用各自維護一次。
 */
export function WorldAdminLinks({
  worldSlug,
  isAdmin,
  isSolo,
}: {
  worldSlug: string;
  isAdmin: boolean;
  isSolo: boolean;
}) {
  const adminLinks: { href: string; label: string; description: string }[] = [
    {
      href: `/dashboard/worlds/${worldSlug}/settings`,
      label: "世界觀設定",
      description: "名稱、簡介、公開範圍、橫幅與 Icon、地圖圖層、刪除世界觀",
    },
    {
      href: `/dashboard/worlds/${worldSlug}/character-template`,
      label: "角色卡設定",
      description: "角色必填欄位與補充章節範本",
    },
    {
      href: `/dashboard/worlds/${worldSlug}/categories`,
      label: "內容分類",
      description: "條目分類、各分類的自訂欄位",
    },
    {
      href: `/dashboard/worlds/${worldSlug}/rules`,
      label: "企劃規則與手冊",
      description: "編輯「規則」分頁顯示給玩家看的內容",
    },
    ...(!isSolo
      ? [
          {
            href: `/dashboard/worlds/${worldSlug}/reports`,
            label: "檢舉列表",
            description: "處理條目與關係線的檢舉",
          },
        ]
      : []),
    ...(isAdmin && !isSolo
      ? [
          {
            href: `/dashboard/worlds/${worldSlug}/members`,
            label: "成員管理",
            description: "邀請成員、調整權限、移除成員",
          },
        ]
      : []),
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {adminLinks.map((l) => (
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
  );
}
