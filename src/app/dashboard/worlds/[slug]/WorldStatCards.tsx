import { ProgressBar } from "@/components/ProgressBar";

/**
 * 世界觀情報卡片——原本擠在側邊欄裡的一條 <dl>,改成三張獨立的數據卡片,
 * 跟公開版/後台版世界觀首頁共用同一份檔案(跟 WorldHero/WorldMapView
 * 同樣的「元件放在 dashboard 底下、公開頁面跨路徑 import」慣例)。
 * 顏色只用 bg-surface/border-border/bg-muted/bg-primary 這些語意化
 * token。
 */
export function WorldStatCards({
  ownerLabel,
  collaborativePercent,
  totalNodeCount,
  pcCount,
  defaultPcQuota,
}: {
  ownerLabel: string | null;
  /** 0~100 之間的整數,null 代表這個世界觀還沒有任何節點,不適用百分比。 */
  collaborativePercent: number | null;
  totalNodeCount: number;
  pcCount: number;
  defaultPcQuota: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs text-muted-foreground">企劃主</p>
        <p className="mt-1 truncate text-lg font-semibold">{ownerLabel ?? "未知"}</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">開放共筆節點</p>
          <p className="text-lg font-semibold">
            {collaborativePercent === null ? "—" : `${collaborativePercent}%`}
          </p>
        </div>
        <div className="mt-2">
          <ProgressBar percent={collaborativePercent ?? 0} />
        </div>
        {totalNodeCount > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">共 {totalNodeCount} 筆節點</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs text-muted-foreground">他人 PC 數</p>
        <p className="mt-1 text-lg font-semibold">{pcCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">每人 PC 配額:{defaultPcQuota}</p>
      </div>
    </div>
  );
}
