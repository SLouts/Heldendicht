import type { ReactNode } from "react";
import { NavMenu } from "@/components/NavMenu";

/**
 * 側邊欄——世界觀情報面板(企劃主/共筆比例/PC 額度)+快捷導覽+選填的
 * 頁尾小記。跟後台版世界觀首頁共用同一份檔案:導覽列的連結內容(公開版
 * 只有兩個、後台版一長串管理連結)由呼叫端自己組好當 navMenu 傳進來,
 * 這裡只負責外層 <NavMenu> 容器,不內建固定的連結清單。
 *
 * 公開版才會傳 footerNote(檢舉說明)——不放 ReportForm:檢舉的對象只能
 * 是單一節點或關係線(report_target_type 只有 'node'/'relationship' 兩種,
 * 沒有「檢舉整個世界觀」這個概念),所以只放文字說明,真正要檢舉還是要
 * 到該節點/關係線自己的頁面。後台版是主辦自己在看,不需要這段說明。
 */
export function WorldSidebar({
  ownerLabel,
  defaultPcQuota,
  collaborativePercent,
  totalNodeCount,
  isPublic,
  navMenu,
  footerNote,
}: {
  ownerLabel: string | null;
  defaultPcQuota: number;
  /** 0~100 之間的整數,null 代表這個世界觀還沒有任何節點,不適用百分比。 */
  collaborativePercent: number | null;
  totalNodeCount: number;
  /** 有值才顯示「公開/私人」徽章,公開版首頁本來就只看得到公開世界觀,不用重複標示。 */
  isPublic?: boolean;
  navMenu: ReactNode;
  footerNote?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">世界觀情報</h2>
          {isPublic !== undefined && (
            <span
              className={
                isPublic
                  ? "rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg"
                  : "rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg"
              }
            >
              {isPublic ? "公開" : "私人"}
            </span>
          )}
        </div>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">企劃主</dt>
            <dd>{ownerLabel ?? "未知"}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">開放共筆節點</dt>
            <dd>
              {collaborativePercent === null ? "—" : `${collaborativePercent}%`}
              {totalNodeCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (共 {totalNodeCount} 筆)
                </span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">每人 PC 配額</dt>
            <dd>{defaultPcQuota}</dd>
          </div>
        </dl>
      </div>

      <NavMenu>{navMenu}</NavMenu>

      {footerNote && <p className="text-xs text-muted-foreground">{footerNote}</p>}
    </div>
  );
}
