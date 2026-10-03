"use client";

import { useRef, useState } from "react";
import { MarkdownText } from "@/components/MarkdownText";
import type { SiteFeatureCardItem } from "@/lib/siteSettings";

/**
 * 首頁「平台特色」區塊——數量不固定的卡片清單(site_feature_cards,
 * migration 040),左右拖曳的輪播形式:桌機用滑鼠按住拖曳(onMouseDown
 * 系列),觸控裝置本來就能直接滑動(overflow-x-auto 原生支援,不需要
 * 額外處理),兩者不會互相干擾——拖曳邏輯只掛在滑鼠事件上。
 *
 * 內容支援 MarkdownText 的 [文字](網址) 連結語法,要推廣某個世界觀就
 * 直接在卡片內容裡放連結,不另外做「選擇世界觀」的下拉選單。
 */
export function FeatureCardsCarousel({ cards }: { cards: SiteFeatureCardItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startX: 0, startScrollLeft: 0, dragged: false });
  const [isDragging, setIsDragging] = useState(false);

  if (cards.length === 0) return null;

  function onMouseDown(e: React.MouseEvent) {
    const el = scrollerRef.current;
    if (!el) return;
    setIsDragging(true);
    dragState.current = { startX: e.clientX, startScrollLeft: el.scrollLeft, dragged: false };
  }

  function onMouseMove(e: React.MouseEvent) {
    const el = scrollerRef.current;
    if (!el || !isDragging) return;
    const delta = e.clientX - dragState.current.startX;
    if (Math.abs(delta) > 3) dragState.current.dragged = true;
    el.scrollLeft = dragState.current.startScrollLeft - delta;
  }

  function stopDragging() {
    setIsDragging(false);
  }

  return (
    <div
      ref={scrollerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      className={`mt-6 flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory ${
        isDragging ? "cursor-grabbing select-none" : "cursor-grab"
      }`}
    >
      {cards.map((card) => (
        <div
          key={card.id}
          className="w-72 shrink-0 snap-start rounded-lg border border-border bg-surface p-4"
        >
          <h3 className="font-display font-semibold">{card.label}</h3>
          <div className="mt-2 text-sm text-muted-foreground [&_p]:mt-0">
            <MarkdownText text={card.content} />
          </div>
        </div>
      ))}
    </div>
  );
}
