"use client";

import { useActionState, useRef, useState } from "react";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { MarkdownText } from "@/components/MarkdownText";
import {
  createWorldAnnouncement,
  updateWorldAnnouncement,
  deleteWorldAnnouncement,
  type AnnouncementFormState,
} from "@/lib/actions/worldAnnouncements";
import type { WorldAnnouncement } from "@/app/(site)/worlds/[slug]/WorldAnnouncementsSection";

/**
 * 世界觀公告的後台管理——跟 OrderedContentEditor(規則欄位用)外觀類似,
 * 但公告是「像部落格文章一樣不斷新增」的時間序紀錄,不能上移/下移,
 * 列表本身也多顯示發布時間/編輯狀態,所以另外做一份,不勉強共用那個
 * 元件。
 */
export function WorldAnnouncementsEditor({
  worldId,
  worldSlug,
  announcements,
}: {
  worldId: string;
  worldSlug: string;
  announcements: WorldAnnouncement[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createWorldAnnouncement,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      {announcements.map((a) => (
        <AnnouncementRow
          key={a.id}
          announcement={a}
          worldSlug={worldSlug}
          onDelete={deleteWorldAnnouncement.bind(null, worldSlug)}
        />
      ))}

      <form
        ref={formRef}
        action={async (formData) => {
          await createAction(formData);
          formRef.current?.reset();
        }}
        className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="worldId" value={worldId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <div className="flex flex-col gap-1">
          <label htmlFor="new-announcement-title" className="text-sm font-medium">
            發布公告
          </label>
          <input
            id="new-announcement-title"
            name="title"
            placeholder="例如「10 月活動公告」"
            required
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
        <textarea
          name="content"
          placeholder="公告內容"
          required
          rows={4}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          支援簡易 markdown:段落、- 清單、**粗體**、*斜體*、[文字](網址) 連結。
        </p>
        <button
          type="submit"
          disabled={createPending}
          className="w-fit rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {createPending ? "發布中…" : "+ 發布"}
        </button>
        {createState && "error" in createState && (
          <p className="text-sm text-danger">{createState.error}</p>
        )}
        {createState && "fieldErrors" in createState && (
          <p className="text-sm text-danger">
            {Object.values(createState.fieldErrors).flat()[0]}
          </p>
        )}
      </form>
    </div>
  );
}

function AnnouncementRow({
  announcement,
  worldSlug,
  onDelete,
}: {
  announcement: WorldAnnouncement;
  worldSlug: string;
  onDelete: (announcementId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState<AnnouncementFormState, FormData>(
    updateWorldAnnouncement,
    undefined,
  );

  if (isEditing) {
    return (
      <form
        action={async (formData) => {
          await formAction(formData);
          setIsEditing(false);
        }}
        className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
      >
        <input type="hidden" name="announcementId" value={announcement.id} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <input
          name="title"
          defaultValue={announcement.title}
          required
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium"
        />
        <textarea
          name="content"
          defaultValue={announcement.content}
          required
          rows={4}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          支援簡易 markdown:段落、- 清單、**粗體**、*斜體*、[文字](網址) 連結。
        </p>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
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
        {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}
        {state && "fieldErrors" in state && (
          <p className="text-sm text-danger">{Object.values(state.fieldErrors).flat()[0]}</p>
        )}
      </form>
    );
  }

  const edited = announcement.updated_at !== announcement.created_at;

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display font-medium">{announcement.title}</span>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(announcement.created_at)}
          {edited && " (已編輯)"}
        </span>
        <div className="ml-auto flex gap-3 text-xs">
          <button type="button" onClick={() => setIsEditing(true)} className="underline">
            編輯
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`確定要刪除「${announcement.title}」這則公告嗎?`)) {
                onDelete(announcement.id);
              }
            }}
            className="text-danger underline"
          >
            刪除
          </button>
        </div>
      </div>
      <div className="mt-2">
        <MarkdownText text={announcement.content} />
      </div>
    </div>
  );
}
