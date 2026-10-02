"use client";

import { useState } from "react";
import Link from "next/link";
import { worldDateValue, formatWorldDate, formatWorldDateRange } from "@/lib/worldDate";

const ZOOM_STEP = 1.3;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 6;

export type TimelineChapterParticipant = {
  title: string;
  href: string;
};

export type TimelineChapterItem = {
  id: string;
  title: string;
  description: string | null;
  yearStart: number | null;
  yearStartMonth: number | null;
  yearStartDay: number | null;
  yearEnd: number | null;
  yearEndMonth: number | null;
  yearEndDay: number | null;
  href: string;
  /** 這個章節標記了哪些角色共同參與("副本")——沒有標記就是空陣列,
   * 不特別顯示參與者這行。 */
  participants: TimelineChapterParticipant[];
};

export type TimelineCharacterEventItem = {
  id: string;
  label: string;
  description: string;
  isSpoiler: boolean;
  worldYear: number;
  worldYearMonth: number | null;
  worldYearDay: number | null;
  characterTitle: string;
  href: string;
};

/**
 * 世界觀「企劃時間軸」的橫向版面——章節在軸線上只標成一個點(定位在
 * yearStart,+選填的月/日細到可以分開同一年內的多個章節),不是橫條;
 * 完整的標題/日期範圍/簡介改成軸線下方的條列清單,角色自己時間軸上填了
 * 「世界觀年份」的時間點一樣以點的方式跟官方章節並排在軸線上——角色自己
 * 頁面上的時間軸不受影響,那邊維持原本的直向版型。
 *
 * 純渲染元件,不查資料;呼叫端(dashboard/public 版 /story 頁面)各自
 * 查好資料、組好每個項目要連去哪裡的 href 再傳進來。
 *
 * 可以放大/縮小——「放大」只是把整條軸線的像素寬度拉長(點跟點之間的
 * 間距跟著變大),不是真的改變字體或 dot 大小,軸線本身維持用
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

  const chapterPositions = timedChapters
    .map((chapter) => ({
      chapter,
      value: worldDateValue(chapter.yearStart, chapter.yearStartMonth, chapter.yearStartDay),
    }))
    .sort((a, b) => a.value - b.value);

  const eventPositions = characterEvents.map((event) => ({
    event,
    value: worldDateValue(event.worldYear, event.worldYearMonth, event.worldYearDay),
  }));

  const values = [...chapterPositions.map((p) => p.value), ...eventPositions.map((p) => p.value)];
  const showRuler = Boolean(yearRange) || values.length > 0;

  const minYear = showRuler ? (yearRange ? yearRange.start : Math.min(...values)) : 0;
  const maxYear = showRuler ? (yearRange ? yearRange.end : Math.max(...values)) : 0;
  const span = Math.max(maxYear - minYear, 1);
  const trackWidth = Math.max(640, span * 36) * zoom;
  // 實際的年份/日期有可能落在主辦設定的軸線範圍之外(範圍設太窄,或還
  // 沒更新)——夾在兩端,至少還看得到,不會整個跑出可視範圍外。
  const pct = (value: number) => Math.min(100, Math.max(0, ((value - minYear) / span) * 100));

  const chaptersForList = [...chapterPositions.map((p) => p.chapter), ...untimedChapters];

  if (!showRuler && chaptersForList.length === 0) return null;

  return (
    <div>
      {showRuler && (
        <>
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
              {/* 章節——軸線上只標一個點,完整資訊在下面的條列清單 */}
              <div className="relative h-5">
                {chapterPositions.map(({ chapter, value }) => (
                  <Link
                    key={chapter.id}
                    href={chapter.href}
                    title={chapter.title}
                    className="absolute bottom-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-surface bg-primary transition hover:scale-125"
                    style={{ left: `${pct(value)}%` }}
                  />
                ))}
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
              {eventPositions.length > 0 && (
                <div className="relative mt-6 h-24">
                  {eventPositions.map(({ event, value }) => (
                    <div
                      key={event.id}
                      className="absolute top-0 flex w-28 -translate-x-1/2 flex-col items-center text-center"
                      style={{ left: `${pct(value)}%` }}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full border-2 border-surface bg-muted-foreground" />
                      <span className="mt-1 text-[11px] text-muted-foreground">
                        {formatWorldDate(event.worldYear, event.worldYearMonth, event.worldYearDay)}
                      </span>
                      {event.isSpoiler ? (
                        <details>
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            ⚠️ 防雷
                          </summary>
                          <Link href={event.href} className="mt-0.5 block text-xs hover:underline">
                            {event.characterTitle} · {event.label}
                          </Link>
                        </details>
                      ) : (
                        <Link href={event.href} className="text-xs leading-tight hover:underline">
                          {event.characterTitle} · {event.label}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {chaptersForList.length > 0 && (
        <div className={showRuler ? "mt-6 border-t border-border pt-4" : undefined}>
          <h3 className="text-sm font-medium text-muted-foreground">章節列表</h3>
          <ChapterPlainList chapters={chaptersForList} />
        </div>
      )}
    </div>
  );
}

function ChapterPlainList({ chapters }: { chapters: TimelineChapterItem[] }) {
  return (
    <ul className="mt-3 divide-y divide-border">
      {chapters.map((chapter) => {
        const dateLabel = formatWorldDateRange(
          chapter.yearStart,
          chapter.yearStartMonth,
          chapter.yearStartDay,
          chapter.yearEnd,
          chapter.yearEndMonth,
          chapter.yearEndDay,
        );
        return (
          <li key={chapter.id} className="py-3">
            <Link href={chapter.href} className="block hover:underline">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{chapter.title}</span>
                {dateLabel && (
                  <span className="text-xs text-muted-foreground">{dateLabel}</span>
                )}
              </div>
              {chapter.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">{chapter.description}</p>
              )}
            </Link>
            {chapter.participants.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                共同副本:
                {chapter.participants.map((p, i) => (
                  <span key={p.href}>
                    {i > 0 && "、"}
                    <Link href={p.href} className="hover:underline">
                      {p.title}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
