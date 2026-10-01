import type { TimelineEventItem } from "./CharacterTimelineEditor";

/**
 * 角色節點的生平時間線——正式的六主題顯示版型,搭配 CharacterTimelineEditor
 * 那個陽春的編輯清單(負責新增/編輯/排序/刪除,不分主題)。跟 NodeIdentityCard
 * 同一個慣例:六份都會渲染,globals.css 依 <html data-art-theme> 決定哪份可見。
 *
 * 版面是橫向的:每個事件是固定寬度的一欄,一列由左到右排開,寬度超出
 * 容器就用 overflow-x-auto 橫向捲動——排序仍然是 CharacterTimelineEditor
 * 既有的上移/下移(跟全站其他排序清單同一套慣例),這裡只負責橫向呈現。
 *
 * 沒有任何時間點就整塊不顯示(跟頭貼/立繪「不填就不顯示」同一套邏輯)。
 *
 * description(簡短描述/標題)一律常駐顯示;content(內文)/imageUrl(配圖)
 * 都選填,有填才會用 <details>/<summary> 包成可展開——跟 node_sections
 * 補充區塊同一套原生 disclosure 元件,不用另外管理彈窗的開關/焦點邏輯。
 * 兩個都沒填就是純文字,不用假裝可以點開。
 *
 * 「目前」(最後一筆)一律用 text-primary/bg-primary 標示——這兩個
 * Tailwind class 底層對應的 CSS 變數本來就會依主題換色(globals.css
 * 裡 :root[data-art-theme="x"] { --primary: ... }),不用每個主題各自
 * 指定一次強調色。
 */

/** 常駐顯示 description,有 content/imageUrl 才包成可展開。八個版型共用。 */
function ExpandableDescription({
  event,
  className,
}: {
  event: TimelineEventItem;
  className: string;
}) {
  // 防雷:連常駐顯示的 description 都收進點開才展開的區塊,因為
  // description 本身就可能是劇透(例如「角色死亡」),不能直接曝光。
  if (event.isSpoiler) {
    return (
      <details>
        <summary className={className + " cursor-pointer"}>
          ⚠️ 防雷內容,點擊查看
        </summary>
        <div className="mt-2 text-sm">
          <p className="whitespace-pre-wrap">{event.description}</p>
          {event.content && (
            <p className="mt-1 whitespace-pre-wrap">{event.content}</p>
          )}
          {event.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={event.imageUrl}
              alt=""
              className="mt-2 max-h-64 w-full rounded border border-border object-cover"
            />
          )}
        </div>
      </details>
    );
  }

  if (!event.content && !event.imageUrl) {
    return <p className={className}>{event.description}</p>;
  }
  return (
    <details>
      <summary className={className + " cursor-pointer"}>{event.description}</summary>
      <div className="mt-2 text-sm">
        {event.content && <p className="whitespace-pre-wrap">{event.content}</p>}
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            src={event.imageUrl}
            alt=""
            className="mt-2 max-h-64 w-full rounded border border-border object-cover"
          />
        )}
      </div>
    </details>
  );
}

/** 三個版型共用的「橫線+圓點」時間軸,只有 dot 形狀跟文字排版是可調的。
 * 每個事件固定寬度排成一列,橫線貫穿所有 dot,超出容器寬度就橫向捲動。 */
function DotTimeline({
  events,
  dotStyle = "circle",
  labelClassName,
  currentLabelClassName,
  descriptionClassName,
  currentDescriptionClassName,
}: {
  events: TimelineEventItem[];
  dotStyle?: "circle" | "star";
  labelClassName: string;
  currentLabelClassName: string;
  descriptionClassName: string;
  currentDescriptionClassName: string;
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative flex min-w-max gap-8 pt-5">
        <div className="absolute top-[9px] right-0 left-0 h-px bg-border" />
        {events.map((event, i) => {
          const isCurrent = i === events.length - 1;
          return (
            <div key={event.id} className="relative w-44 shrink-0">
              {dotStyle === "star" ? (
                <span
                  className={
                    isCurrent
                      ? "absolute top-0 left-0 text-sm text-primary"
                      : "absolute top-0 left-0 text-sm text-muted-foreground"
                  }
                >
                  ✦
                </span>
              ) : (
                <span
                  className={
                    isCurrent
                      ? "absolute top-0.5 left-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-primary"
                      : "absolute top-0.5 left-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-border"
                  }
                />
              )}
              <div className={"pt-4 " + (isCurrent ? currentLabelClassName : labelClassName)}>
                {event.label}
              </div>
              <ExpandableDescription
                event={event}
                className={
                  "mt-0.5 " + (isCurrent ? currentDescriptionClassName : descriptionClassName)
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CharacterTimelineDisplay({ events }: { events: TimelineEventItem[] }) {
  if (events.length === 0) return null;

  return (
    <>
      {/* ---------- 01 劇本手稿:日誌橫欄(預設) ---------- */}
      <div className="char-timeline-variant char-timeline-script border border-border bg-surface p-4">
        <h2 className="font-display mb-3 text-sm">生平時間線</h2>
        <div className="overflow-x-auto">
          <div className="flex min-w-max divide-x divide-border">
            {events.map((event, i) => {
              const isCurrent = i === events.length - 1;
              return (
                <div key={event.id} className="w-48 shrink-0 px-3 leading-relaxed first:pl-0 last:pr-0">
                  <div
                    className={
                      "mb-1 text-xs uppercase tracking-wide " +
                      (isCurrent ? "text-primary" : "text-muted-foreground")
                    }
                  >
                    {event.label}
                  </div>
                  <ExpandableDescription
                    event={event}
                    className={isCurrent ? "text-primary" : ""}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- 02 田野筆記:點格紙 ---------- */}
      <div className="char-timeline-variant char-timeline-field hero-field-dots rounded-lg border border-border p-5">
        <h2 className="font-display mb-3 text-lg">生平時間線</h2>
        <DotTimeline
          events={events}
          labelClassName="text-xs uppercase tracking-wide text-muted-foreground"
          currentLabelClassName="text-xs uppercase tracking-wide text-primary"
          descriptionClassName="text-sm"
          currentDescriptionClassName="text-sm text-primary"
        />
      </div>

      {/* ---------- 03 東方玄幻:硃砂印 ---------- */}
      <div className="char-timeline-variant char-timeline-wuxia rounded-none border border-border bg-surface p-5">
        <h2 className="font-display mb-3 text-lg">生平時間線</h2>
        <DotTimeline
          events={events}
          labelClassName="text-sm text-muted-foreground"
          currentLabelClassName="text-sm text-primary"
          descriptionClassName="text-sm"
          currentDescriptionClassName="text-sm text-primary"
        />
      </div>

      {/* ---------- 04 羊皮紙卷軸:攤開的卷軸 ---------- */}
      <div className="char-timeline-variant char-timeline-scroll">
        <div className="hero-scroll-rod" />
        <div className="bg-surface scroll-foxing px-5 py-6 text-center">
          <h2 className="font-display mb-4 text-lg">生平時間線</h2>
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-start justify-center gap-4">
              {events.map((event, i) => {
                const isCurrent = i === events.length - 1;
                return (
                  <div key={event.id} className="flex items-start gap-4">
                    {i > 0 && <div className="mt-0.5 text-muted-foreground">✦</div>}
                    <div className="w-40">
                      <div
                        className={
                          "text-sm italic " +
                          (isCurrent ? "text-primary" : "text-muted-foreground")
                        }
                      >
                        {event.label}
                      </div>
                      <ExpandableDescription
                        event={event}
                        className={"mt-0.5 text-sm " + (isCurrent ? "text-primary" : "")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="hero-scroll-rod" />
      </div>

      {/* ---------- 05 製圖師手記:方格野帳 ---------- */}
      <div className="char-timeline-variant char-timeline-cartographer hero-cartographer-grid relative rounded-none border-2 border-border p-5">
        <h2 className="font-display mb-3 text-lg">生平時間線</h2>
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {events.map((event, i) => {
              const isCurrent = i === events.length - 1;
              return (
                <div
                  key={event.id}
                  className={
                    "w-48 shrink-0 border border-dashed p-2 " +
                    (isCurrent ? "border-primary" : "border-border")
                  }
                >
                  <div
                    className={
                      "text-xs uppercase tracking-wide " +
                      (isCurrent ? "text-primary" : "text-muted-foreground")
                    }
                  >
                    {event.label}
                  </div>
                  <ExpandableDescription
                    event={event}
                    className={"text-sm " + (isCurrent ? "text-primary" : "")}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- 06 占星曆書:星點夜色 ---------- */}
      <div className="char-timeline-variant char-timeline-almanac rounded border border-border bg-surface p-5">
        <h2 className="font-display mb-3 text-lg">生平時間線</h2>
        <DotTimeline
          events={events}
          dotStyle="star"
          labelClassName="text-sm italic text-muted-foreground"
          currentLabelClassName="text-sm italic text-primary"
          descriptionClassName="text-sm"
          currentDescriptionClassName="text-sm text-primary"
        />
      </div>
    </>
  );
}
