import Link from "next/link";
import { ReportForm } from "@/components/ReportForm";
import {
  CharacterFieldsDisplay,
  type CharacterFieldWithValue,
} from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/CharacterFieldsForm";

/**
 * 節點頁面桌面雙欄佈局的側邊欄資訊卡——代表圖/頭貼、屬性標籤、所屬
 * 世界觀、檢舉按鈕,角色節點另外附自訂欄位跟立繪。只用 CSS 變數綁定的
 * Tailwind class(border-border/bg-surface/text-muted-foreground 等),
 * 不需要像 NodeHero/CharacterTimelineDisplay 那樣手刻八套版型——這幾個
 * token 本來就會跟著 <html data-art-theme> 換色。
 */
export function NodeInfobox({
  nodeId,
  worldName,
  worldSlug,
  nodeSlug,
  nodeTypeLabel,
  categoryName,
  characterType,
  extraBadges,
  ownerLabel,
  avatarUrl,
  coverUrl,
  illustrationUrl,
  characterFields,
}: {
  nodeId: string;
  worldName: string;
  worldSlug: string;
  nodeSlug: string;
  nodeTypeLabel: string;
  categoryName: string | null;
  /** null = 不是角色節點。 */
  characterType: "pc" | "npc" | null;
  extraBadges?: React.ReactNode;
  ownerLabel: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  illustrationUrl: string | null;
  characterFields: CharacterFieldWithValue[];
}) {
  // 有頭貼優先用頭貼當縮圖(角色節點),沒有就退回代表圖——跟 NodeHero
  // 橫幅同一套「沒有就不佔位」邏輯,不強迫塞一張預設圖。
  const thumbnailUrl = avatarUrl ?? coverUrl;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
        <img
          src={thumbnailUrl}
          alt=""
          className="aspect-square w-full rounded-lg border border-border object-cover"
        />
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
          {nodeTypeLabel}
        </span>
        {characterType && (
          <span
            className={
              characterType === "pc"
                ? "rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg"
                : "rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg"
            }
          >
            {characterType === "pc" ? "PC" : "NPC"}
          </span>
        )}
        {categoryName && (
          <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
            {categoryName}
          </span>
        )}
        {extraBadges}
      </div>

      <dl className="mt-3 flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">所屬世界觀</dt>
          <dd>
            <Link href={`/worlds/${worldSlug}`} className="hover:underline">
              {worldName}
            </Link>
          </dd>
        </div>
        {ownerLabel && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">擁有者</dt>
            <dd>{ownerLabel}</dd>
          </div>
        )}
      </dl>

      {characterFields.some((f) => f.value.trim() !== "") && (
        <div className="mt-3 border-t border-border pt-3">
          <CharacterFieldsDisplay fields={characterFields} compact />
        </div>
      )}

      {illustrationUrl && (
        <div className="mt-3 flex flex-col items-center gap-1 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">立繪</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
          <img
            src={illustrationUrl}
            alt=""
            className="w-full rounded-lg border border-border"
          />
        </div>
      )}

      <div className="mt-3 border-t border-border pt-3">
        <ReportForm
          targetType="node"
          targetId={nodeId}
          redirectPath={`/worlds/${worldSlug}/nodes/${nodeSlug}`}
        />
      </div>
    </div>
  );
}
