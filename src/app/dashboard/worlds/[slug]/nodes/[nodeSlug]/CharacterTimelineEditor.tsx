"use client";

import { useActionState, useRef, useState } from "react";
import {
  createTimelineEvent,
  deleteTimelineEvent,
  moveTimelineEvent,
  updateTimelineEvent,
} from "@/lib/actions/characterTimeline";
import { TimelineEventImageUpload } from "./TimelineEventImageUpload";

export type TimelineEventItem = {
  id: string;
  label: string;
  /** 常駐顯示的簡短標題,CharacterTimelineDisplay 點開/展開前看到的那行。 */
  description: string;
  /** 展開才看到的長文內容,選填。 */
  content: string;
  /** 展開才看到的配圖,選填。 */
  imageUrl: string | null;
  /** 防雷標記,開啟後連 description 都要點擊才會顯示。 */
  isSpoiler: boolean;
};

/**
 * 陽春的管理清單,不分美術方向——八主題的正式顯示樣式(含展開內文/配圖)
 * 是另一個 display 元件(CharacterTimelineDisplay),這裡只負責新增/
 * 編輯/排序/刪除,以及配圖上傳(見 TimelineEventImageUpload)。
 */
function TimelineEventRow({
  event,
  index,
  total,
  nodeId,
  worldSlug,
  nodeSlug,
  canEdit,
}: {
  event: TimelineEventItem;
  index: number;
  total: number;
  nodeId: string;
  worldSlug: string;
  nodeSlug: string;
  canEdit: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateTimelineEvent,
    undefined,
  );

  if (isEditing) {
    return (
      <li className="rounded-lg border border-border bg-surface p-3">
        <form
          action={async (formData) => {
            await formAction(formData);
            setIsEditing(false);
          }}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="worldSlug" value={worldSlug} />
          <input type="hidden" name="nodeSlug" value={nodeSlug} />
          <input
            name="label"
            defaultValue={event.label}
            required
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium"
          />
          <textarea
            name="description"
            defaultValue={event.description}
            placeholder="簡短描述(標題),常駐顯示"
            rows={2}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          <textarea
            name="content"
            defaultValue={event.content}
            placeholder="內文(選填,展開才會看到)"
            rows={4}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              name="isSpoiler"
              defaultChecked={event.isSpoiler}
            />
            標記防雷(連描述都要點擊才會顯示)
          </label>
          {state && "error" in state && (
            <p className="text-sm text-danger">{state.error}</p>
          )}
          {state && "fieldErrors" in state && (
            <p className="text-sm text-danger">
              {Object.values(state.fieldErrors).flat()[0]}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="w-fit rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
            >
              {pending ? "儲存中…" : "儲存"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-sm text-muted-foreground underline"
            >
              取消
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-3">
      <p className="font-medium">
        {event.label}
        {event.isSpoiler && (
          <span className="ml-1.5 rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs font-normal text-badge-pending-fg">
            防雷
          </span>
        )}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
        {event.description}
      </p>
      {event.content && (
        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
          內文:{event.content}
        </p>
      )}
      {canEdit && (
        <div className="mt-3 border-t border-border pt-2">
          <TimelineEventImageUpload
            eventId={event.id}
            worldSlug={worldSlug}
            nodeSlug={nodeSlug}
            imageUrl={event.imageUrl}
          />
        </div>
      )}
      {canEdit && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-2 text-xs">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="underline"
          >
            編輯
          </button>
          <button
            type="button"
            disabled={index === 0}
            onClick={() =>
              void moveTimelineEvent(event.id, nodeId, worldSlug, nodeSlug, "up")
            }
            className="underline disabled:opacity-30"
          >
            上移
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() =>
              void moveTimelineEvent(
                event.id,
                nodeId,
                worldSlug,
                nodeSlug,
                "down",
              )
            }
            className="underline disabled:opacity-30"
          >
            下移
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`確定要刪除「${event.label}」這個時間點嗎?`)) {
                void deleteTimelineEvent(event.id, worldSlug, nodeSlug);
              }
            }}
            className="text-danger underline"
          >
            刪除
          </button>
        </div>
      )}
    </li>
  );
}

export function CharacterTimelineEditor({
  nodeId,
  worldSlug,
  nodeSlug,
  canEdit,
  events,
}: {
  nodeId: string;
  worldSlug: string;
  nodeSlug: string;
  canEdit: boolean;
  events: TimelineEventItem[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createTimelineEvent,
    undefined,
  );
  const createFormRef = useRef<HTMLFormElement>(null);

  // 唯讀時交給 CharacterTimelineDisplay(八主題正式版型)顯示,這裡只負責
  // 編輯用的管理清單,不重複渲染同一批內容。
  if (!canEdit) return null;

  return (
    <section className="mt-4">
      <h2 className="text-lg font-semibold">時間軸管理</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        新增/編輯/排序這裡的時間點,會同步反映在上面的生平時間線。
      </p>

      <ol className="mt-3 flex flex-col gap-2">
        {events.map((event, i) => (
          <TimelineEventRow
            key={event.id}
            event={event}
            index={i}
            total={events.length}
            nodeId={nodeId}
            worldSlug={worldSlug}
            nodeSlug={nodeSlug}
            canEdit={canEdit}
          />
        ))}
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">還沒有任何時間點。</p>
        )}
      </ol>

      {canEdit && (
        <form
          ref={createFormRef}
          action={async (formData) => {
            await createAction(formData);
            createFormRef.current?.reset();
          }}
          className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3"
        >
          <input type="hidden" name="nodeId" value={nodeId} />
          <input type="hidden" name="worldSlug" value={worldSlug} />
          <input type="hidden" name="nodeSlug" value={nodeSlug} />
          <input
            name="label"
            placeholder="標籤,例如「十三歲(十年前)」"
            required
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <textarea
            name="description"
            placeholder="簡短描述(標題),常駐顯示"
            rows={2}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <textarea
            name="content"
            placeholder="內文(選填,展開才會看到;配圖請先新增後在下面上傳)"
            rows={3}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="isSpoiler" />
            標記防雷(連描述都要點擊才會顯示)
          </label>
          {createState && "error" in createState && (
            <p className="text-sm text-danger">{createState.error}</p>
          )}
          {createState && "fieldErrors" in createState && (
            <p className="text-sm text-danger">
              {Object.values(createState.fieldErrors).flat()[0]}
            </p>
          )}
          <button
            type="submit"
            disabled={createPending}
            className="w-fit rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            {createPending ? "新增中…" : "+ 新增時間點"}
          </button>
        </form>
      )}
    </section>
  );
}
