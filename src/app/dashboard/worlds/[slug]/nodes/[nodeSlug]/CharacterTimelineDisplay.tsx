import type { TimelineEventItem } from "./CharacterTimelineEditor";

/**
 * 角色節點的生平時間線——正式的八主題顯示版型,搭配 CharacterTimelineEditor
 * 那個陽春的編輯清單(負責新增/編輯/排序/刪除,不分主題)。跟 NodeIdentityCard
 * 同一個慣例:八份都會渲染,globals.css 依 <html data-art-theme> 決定哪份可見。
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

/** 五個版型共用的「直線+圓點」時間軸,只有 dot 形狀跟文字排版是可調的。 */
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
    <div className="relative pl-6">
      <div className="absolute top-0.5 bottom-0.5 left-[7px] w-px bg-border" />
      {events.map((event, i) => {
        const isCurrent = i === events.length - 1;
        return (
          <div key={event.id} className={i === events.length - 1 ? "relative" : "relative pb-4"}>
            {dotStyle === "star" ? (
              <span
                className={
                  isCurrent
                    ? "absolute -left-6 top-0 text-sm text-primary"
                    : "absolute -left-6 top-0 text-sm text-muted-foreground"
                }
              >
                ✦
              </span>
            ) : (
              <span
                className={
                  isCurrent
                    ? "absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-primary"
                    : "absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-border"
                }
              />
            )}
            <div className={isCurrent ? currentLabelClassName : labelClassName}>
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
  );
}

export function CharacterTimelineDisplay({ events }: { events: TimelineEventItem[] }) {
  if (events.length === 0) return null;

  return (
    <>
      {/* ---------- 01 泥金手抄本 ---------- */}
      <div className="char-timeline-variant char-timeline-illuminated rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display mb-3 text-lg text-primary">生平時間線</h2>
        <DotTimeline
          events={events}
          labelClassName="text-sm italic text-muted-foreground"
          currentLabelClassName="text-sm italic text-primary"
          descriptionClassName="text-sm"
          currentDescriptionClassName="text-sm text-primary"
        />
      </div>

      {/* ---------- 02 劇本手稿:日誌表格 ---------- */}
      <div className="char-timeline-variant char-timeline-script border border-border bg-surface p-4">
        <h2 className="font-display mb-3 text-sm">生平時間線</h2>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {events.map((event, i) => {
              const isCurrent = i === events.length - 1;
              return (
                <tr key={event.id} className={isCurrent ? undefined : "border-b border-border"}>
                  <td
                    className={
                      "w-24 whitespace-nowrap py-2 pr-2 align-top text-xs uppercase tracking-wide " +
                      (isCurrent ? "text-primary" : "text-muted-foreground")
                    }
                  >
                    {event.label}
                  </td>
                  <td className="py-2 leading-relaxed align-top">
                    <ExpandableDescription
                      event={event}
                      className={isCurrent ? "text-primary" : ""}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------- 03 田野筆記:點格紙 ---------- */}
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

      {/* ---------- 04 角色卡牌:卡框footer ---------- */}
      <div className="char-timeline-variant char-timeline-card rounded-lg border border-border bg-surface px-4 py-3">
        <h2 className="font-display mb-2 text-sm">生平時間線</h2>
        <div className="flex flex-col gap-2 text-sm">
          {events.map((event, i) => {
            const isCurrent = i === events.length - 1;
            return (
              <div key={event.id} className="flex gap-3">
                <b
                  className={
                    "w-24 shrink-0 text-xs font-normal " +
                    (isCurrent ? "text-primary" : "text-muted-foreground")
                  }
                >
                  {event.label}
                </b>
                <div className="flex-1">
                  <ExpandableDescription
                    event={event}
                    className={isCurrent ? "text-primary" : ""}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- 05 東方玄幻:硃砂印 ---------- */}
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

      {/* ---------- 06 羊皮紙卷軸:攤開的卷軸 ---------- */}
      <div className="char-timeline-variant char-timeline-scroll">
        <div className="hero-scroll-rod" />
        <div className="bg-surface px-5 py-6 text-center">
          <h2 className="font-display mb-4 text-lg">生平時間線</h2>
          <div className="flex flex-col gap-3">
            {events.map((event, i) => {
              const isCurrent = i === events.length - 1;
              return (
                <div key={event.id}>
                  {i > 0 && <div className="mb-3 text-muted-foreground">✦</div>}
                  <div
                    className={
                      "text-sm italic " + (isCurrent ? "text-primary" : "text-muted-foreground")
                    }
                  >
                    {event.label}
                  </div>
                  <ExpandableDescription
                    event={event}
                    className={"mt-0.5 text-sm " + (isCurrent ? "text-primary" : "")}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="hero-scroll-rod" />
      </div>

      {/* ---------- 07 製圖師手記:方格野帳 ---------- */}
      <div className="char-timeline-variant char-timeline-cartographer hero-cartographer-grid relative rounded-none border-2 border-border p-5">
        <h2 className="font-display mb-3 text-lg">生平時間線</h2>
        <div className="flex flex-col gap-2">
          {events.map((event, i) => {
            const isCurrent = i === events.length - 1;
            return (
              <div
                key={event.id}
                className={
                  "border border-dashed p-2 " +
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

      {/* ---------- 08 占星曆書:星點夜色 ---------- */}
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
