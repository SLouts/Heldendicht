"use client";

import { useActionState, useRef, useState } from "react";
import {
  createTimelineEvent,
  deleteTimelineEvent,
  moveTimelineEvent,
  updateTimelineEvent,
} from "@/lib/actions/characterTimeline";

export type TimelineEventItem = {
  id: string;
  label: string;
  description: string;
};

/**
 * Phase 1:陽春的清單編輯器,不分美術方向。八主題的正式顯示樣式留給
 * Phase 2 的另一個 display 元件,這裡只負責新增/編輯/排序/刪除。
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
            rows={3}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
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
      <p className="font-medium">{event.label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
        {event.description}
      </p>
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
            placeholder="這個時間點發生的事"
            rows={2}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
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
