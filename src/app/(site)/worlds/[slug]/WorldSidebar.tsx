import type { ReactNode } from "react";

/**
 * 側邊欄——只在電腦版兩欄排版裡使用(手機版走 WorldMainTabs,不會渲染
 * 這個元件)。跟後台版世界觀首頁共用同一份檔案:導覽連結內容(公開版
 * 通常只有故事時間軸/關係圖譜/世界地圖、後台版另外多管理連結)由呼叫端
 * 自己組好當 navMenu 傳進來。企劃主/PC 配額這兩項資訊回到側邊欄用純
 * 文字列呈現(不是獨立的卡片),導覽連結也是單純的直向文字連結,不套
 * 底色的膠囊列——共筆比例改用 Hero 旁邊的徽章顯示,這裡不重複。
 *
 * 公開版才會傳 footerNote(檢舉說明)——不放 ReportForm:檢舉的對象只能
 * 是單一節點或關係線(report_target_type 只有 'node'/'relationship' 兩種,
 * 沒有「檢舉整個世界觀」這個概念),所以只放文字說明,真正要檢舉還是要
 * 到該節點/關係線自己的頁面。後台版是主辦自己在看,不需要這段說明。
 */
export function WorldSidebar({
  ownerLabel,
  defaultPcQuota,
  navMenu,
  footerNote,
}: {
  ownerLabel: string | null;
  defaultPcQuota: number;
  navMenu: ReactNode;
  footerNote?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">企劃主</dt>
          <dd>{ownerLabel ?? "未知"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">每人 PC 配額</dt>
          <dd>{defaultPcQuota}</dd>
        </div>
      </dl>

      <nav className="flex flex-col gap-2 text-sm">{navMenu}</nav>

      {footerNote && <p className="text-xs text-muted-foreground">{footerNote}</p>}
    </div>
  );
}
