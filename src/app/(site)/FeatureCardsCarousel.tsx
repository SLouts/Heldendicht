"use client";

import { useRef, useState } from "react";
import { MarkdownText } from "@/components/MarkdownText";
import { WorldCard } from "@/components/WorldCard";
import type { SiteFeatureCardItem, FeaturedWorldCardItem } from "@/lib/siteSettings";

/**
 * 首頁 What's New 區塊——數量不固定的卡片清單,左右拖曳的輪播形式:
 * 桌機用滑鼠按住拖曳(onMouseDown 系列),觸控裝置本來就能直接滑動
 * (overflow-x-auto 原生支援,不需要額外處理),兩者不會互相干擾——
 * 拖曳邏輯只掛在滑鼠事件上。
 *
 * 兩種卡片依序顯示,不交錯排列(各自獨立排序,見 siteFeatureCards.ts
 * 的說明):
 *   1. 文字卡片(site_feature_cards,card_type='text',migration 040)
 *      ——內容支援 MarkdownText 的 [文字](網址) 連結語法。
 *   2. 世界觀卡片(card_type='world',migration 041)——站務勾選的公開
 *      世界觀,跟個人頁面同一套 WorldCard 外觀(橫幅+頭貼+一句話介紹)。
 */
export function FeatureCardsCarousel({
  cards,
  worldCards,
}: {
  cards: SiteFeatureCardItem[];
  worldCards: FeaturedWorldCardItem[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startX: 0, startScrollLeft: 0, dragged: false });
  const [isDragging, setIsDragging] = useState(false);

  if (cards.length === 0 && worldCards.length === 0) return null;

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

  // 拖完放開時,瀏覽器還是會在滑鼠底下的元素(例如世界觀卡片的連結)
  // 觸發一次 click——真的拖曳過(dragged=true)就攔下來,避免放開滑鼠
  // 時意外點進連結;單純點一下(沒有拖曳位移)放行,連結照常可以點。
  function onClickCapture(e: React.MouseEvent) {
    if (dragState.current.dragged) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.dragged = false;
    }
  }

  return (
    <div
      ref={scrollerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      onClickCapture={onClickCapture}
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
      {worldCards.map((world) => (
        <div key={world.id} className="w-72 shrink-0 snap-start">
          <WorldCard
            slug={world.slug}
            name={world.name}
            tagline={world.tagline}
            bannerUrl={world.bannerUrl}
            iconUrl={world.iconUrl}
          />
        </div>
      ))}
    </div>
  );
}
