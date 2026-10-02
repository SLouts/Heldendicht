"use client";

import { useState } from "react";
import Link from "next/link";

const ZOOM_STEP = 1.3;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 6;

export type TimelineChapterItem = {
  id: string;
  title: string;
  description: string | null;
  yearStart: number | null;
  yearEnd: number | null;
  href: string;
};

export type TimelineCharacterEventItem = {
  id: string;
  label: string;
  description: string;
  isSpoiler: boolean;
  worldYear: number;
  characterTitle: string;
  href: string;
};

/**
 * 世界觀「企劃時間軸」的橫向版面——章節照 yearStart/yearEnd 定位成一條
 * 橫軸上的區段(只填 yearStart 就是一個時間點,兩個都填就是橫跨一段
 * 年份的橫條),角色自己時間軸上填了「世界觀年份」的時間點也會一起混進
 * 同一條軸線上(見 character_timeline_events.world_year),跟官方章節
 * 並排顯示——角色自己頁面上的時間軸不受影響,那邊維持原本的直向版型。
 *
 * 純渲染元件,不查資料;呼叫端(dashboard/public 版 /story 頁面)各自
 * 查好資料、組好每個項目要連去哪裡的 href 再傳進來。
 *
 * 可以放大/縮小——「放大」只是把整條軸線的像素寬度拉長(章節/時間點
 * 之間的間距跟著變大),不是真的改變字體或 dot 大小,軸線本身維持用
 * overflow-x-auto 橫向捲動,不需要額外的手勢/縮放函式庫。
 */
export function WorldStoryTimeline({
  chapters,
  characterEvents,
  yearRange,
}: {
  chapters: TimelineChapterItem[];
  characterEvents: TimelineCharacterEventItem[];
  /** 主辦自己設定的軸線顯示範圍(worlds.story_timeline_year_start/year_end)
   * ——有設定就優先用這組當軸線端點,不管目前實際有沒有涵蓋這麼多資料;
   * 沒設定(null/undefined)才退回用章節/時間點本身的最小/最大年份。 */
  yearRange?: { start: number; end: number } | null;
}) {
  const [zoom, setZoom] = useState(1);
  const timedChapters = chapters.filter(
    (c): c is TimelineChapterItem & { yearStart: number } => c.yearStart != null,
  );
  const untimedChapters = chapters.filter((c) => c.yearStart == null);

  const years = [
    ...timedChapters.flatMap((c) => [c.yearStart, c.yearEnd ?? c.yearStart]),
    ...characterEvents.map((e) => e.worldYear),
  ];

  if (!yearRange && years.length === 0) {
    return untimedChapters.length > 0 ? (
      <ChapterPlainList chapters={untimedChapters} />
    ) : null;
  }

  const minYear = yearRange ? yearRange.start : Math.min(...years);
  const maxYear = yearRange ? yearRange.end : Math.max(...years);
  const span = Math.max(maxYear - minYear, 1);
  const trackWidth = Math.max(640, span * 36) * zoom;
  // 章節/時間點的實際年份有可能落在主辦設定的軸線範圍之外(範圍設太窄,
  // 或還沒更新)——夾在兩端,至少還看得到,不會整個跑出可視範圍外。
  const pct = (year: number) => Math.min(100, Math.max(0, ((year - minYear) / span) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP))}
          disabled={zoom <= MIN_ZOOM}
          aria-label="縮小時間軸"
          className="rounded-lg border border-border bg-surface px-2 py-1 text-sm hover:bg-muted disabled:opacity-30"
        >
          −
        </button>
        <span className="w-12 text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP))}
          disabled={zoom >= MAX_ZOOM}
          aria-label="放大時間軸"
          className="rounded-lg border border-border bg-surface px-2 py-1 text-sm hover:bg-muted disabled:opacity-30"
        >
          ＋
        </button>
      </div>
      <div className="overflow-x-auto pb-2">
        <div style={{ width: trackWidth }} className="min-w-full">
          {/* 章節(橫條/時間點),用連結點到章節詳細頁 */}
          <div className="relative h-10">
            {timedChapters.map((c) => {
              const left = pct(c.yearStart);
              const rightYear = c.yearEnd ?? c.yearStart;
              const width = Math.max(pct(rightYear) - left, 3);
              return (
                <Link
                  key={c.id}
                  href={c.href}
                  title={c.title}
                  className="absolute bottom-0 flex h-8 items-center justify-center overflow-hidden rounded border border-primary bg-primary/10 px-1.5 text-xs font-medium whitespace-nowrap text-primary hover:bg-primary/20"
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  {c.title}
                </Link>
              );
            })}
          </div>

          {/* 橫軸本身,兩端標年份 */}
          <div className="relative mt-1 h-px bg-border">
            <span className="absolute top-1.5 left-0 text-xs text-muted-foreground">
              {minYear}
            </span>
            <span className="absolute top-1.5 right-0 text-xs text-muted-foreground">
              {maxYear}
            </span>
          </div>

          {/* 角色自己時間軸上填了世界觀年份的時間點,跟官方章節並排 */}
          {characterEvents.length > 0 && (
            <div className="relative mt-6 h-24">
              {characterEvents.map((e) => (
                <div
                  key={e.id}
                  className="absolute top-0 flex w-28 -translate-x-1/2 flex-col items-center text-center"
                  style={{ left: `${pct(e.worldYear)}%` }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full border-2 border-surface bg-muted-foreground" />
                  {e.isSpoiler ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-muted-foreground">
                        ⚠️ 防雷
                      </summary>
                      <Link href={e.href} className="mt-0.5 block text-xs hover:underline">
                        {e.characterTitle} · {e.label}
                      </Link>
                    </details>
                  ) : (
                    <Link href={e.href} className="mt-1 text-xs leading-tight hover:underline">
                      {e.characterTitle} · {e.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {untimedChapters.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-muted-foreground">還沒填年份的章節</h3>
          <ChapterPlainList chapters={untimedChapters} />
        </div>
      )}
    </div>
  );
}

function ChapterPlainList({ chapters }: { chapters: TimelineChapterItem[] }) {
  return (
    <ul className="mt-3 divide-y divide-border">
      {chapters.map((chapter) => (
        <li key={chapter.id}>
          <Link href={chapter.href} className="block py-3 hover:underline">
            {chapter.title}
            {chapter.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{chapter.description}</p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
