import type { ReactNode } from "react";
import { NavMenu } from "@/components/NavMenu";

/**
 * 側邊欄——現在只剩管理/次要導覽連結+選填的頁尾小記。世界觀情報(企劃主/
 * 共筆比例/PC 額度)搬到首頁上方的 WorldStatCards,公開/私人徽章搬到
 * Hero 下面的類型標籤列,這裡不重複顯示。跟後台版世界觀首頁共用同一份
 * 檔案:導覽列的連結內容(公開版通常沒有、後台版是管理連結)由呼叫端
 * 自己組好當 navMenu 傳進來,這裡只負責外層 <NavMenu> 容器。
 *
 * 公開版才會傳 footerNote(檢舉說明)——不放 ReportForm:檢舉的對象只能
 * 是單一節點或關係線(report_target_type 只有 'node'/'relationship' 兩種,
 * 沒有「檢舉整個世界觀」這個概念),所以只放文字說明,真正要檢舉還是要
 * 到該節點/關係線自己的頁面。後台版是主辦自己在看,不需要這段說明。
 */
export function WorldSidebar({
  navMenu,
  footerNote,
}: {
  navMenu: ReactNode;
  footerNote?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <NavMenu>{navMenu}</NavMenu>

      {footerNote && <p className="text-xs text-muted-foreground">{footerNote}</p>}
    </div>
  );
}
