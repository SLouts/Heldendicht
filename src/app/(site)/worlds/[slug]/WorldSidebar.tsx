import Link from "next/link";
import { NavMenu } from "@/components/NavMenu";

/**
 * 側邊欄——世界觀情報面板(企劃主/共筆比例/PC 額度)+快捷導覽+免責小記。
 *
 * 不放 ReportForm:檢舉的對象只能是單一節點或關係線(report_target_type
 * 只有 'node'/'relationship' 兩種,沒有「檢舉整個世界觀」這個概念),
 * 所以這裡只放文字說明,真正要檢舉還是要到該節點/關係線自己的頁面。
 */
export function WorldSidebar({
  worldSlug,
  ownerLabel,
  defaultPcQuota,
  collaborativePercent,
  totalNodeCount,
}: {
  worldSlug: string;
  ownerLabel: string | null;
  defaultPcQuota: number;
  /** 0~100 之間的整數,null 代表這個世界觀還沒有任何節點,不適用百分比。 */
  collaborativePercent: number | null;
  totalNodeCount: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">世界觀情報</h2>
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

      <NavMenu>
        <Link
          href={`/worlds/${worldSlug}/story`}
          className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
        >
          故事時間軸
        </Link>
        <Link
          href={`/worlds/${worldSlug}/map`}
          className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
        >
          關係圖
        </Link>
      </NavMenu>

      <p className="text-xs text-muted-foreground">
        對特定節點或關係線有疑慮嗎?到該節點/關係線自己的頁面可以個別檢舉,主辦會盡快處理。
      </p>
    </div>
  );
}
