"use client";

import { useActionState } from "react";
import { saveChapterSubmission } from "@/lib/actions/story";
import { Badge } from "@/components/Badge";
import type { StoryChapterSubmissionStatus } from "@/lib/supabase/database.types";

const STATUS_LABEL: Record<StoryChapterSubmissionStatus, string> = {
  draft: "草稿",
  pending: "審核中",
  approved: "已核准",
  rejected: "已退回",
};

/**
 * 「副本」參與角色自己寫投稿——個人投稿(characterNodeId 有值)或共同
 * 投稿(characterNodeId 為 null)共用同一個元件,只有自己(個人投稿的
 * 角色擁有者,或共同投稿的任一位參與角色)才會看到這個可編輯表單,見
 * 呼叫端的 canEdit 判斷。
 *
 * 狀態是 pending/approved 時鎖住、改顯示唯讀內容——跟 RLS 的
 * story_chapter_submissions_participant_update 完全對齊(那兩個狀態下
 * 參與者本來就寫不進去),這裡只是提早在 UI 上反映,不是另一套規則。
 */
export function ChapterSubmissionForm({
  chapterId,
  worldSlug,
  characterNodeId,
  label,
  status,
  content,
  reviewNote,
}: {
  chapterId: string;
  worldSlug: string;
  characterNodeId: string | null;
  label: string;
  status: StoryChapterSubmissionStatus | "none";
  content: string;
  reviewNote: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveChapterSubmission, undefined);

  const locked = status === "pending" || status === "approved";

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">{label}</p>
        {status !== "none" && (
          <Badge
            variant={
              status === "approved" ? "success" : status === "rejected" ? "danger" : status === "pending" ? "pending" : "neutral"
            }
          >
            {STATUS_LABEL[status]}
          </Badge>
        )}
      </div>

      {locked ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {content || "(尚未填寫內容)"}
        </p>
      ) : (
        <form action={formAction} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="chapterId" value={chapterId} />
          <input type="hidden" name="worldSlug" value={worldSlug} />
          {characterNodeId && <input type="hidden" name="characterNodeId" value={characterNodeId} />}

          {status === "rejected" && reviewNote && (
            <p className="rounded-lg bg-badge-danger-bg px-3 py-2 text-sm text-badge-danger-fg">
              退回原因:{reviewNote}
            </p>
          )}

          <textarea
            name="content"
            defaultValue={content}
            rows={4}
            placeholder="寫下這個副本裡發生的事……"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          {state && "fieldErrors" in state && state.fieldErrors.content && (
            <p className="text-sm text-danger">{state.fieldErrors.content[0]}</p>
          )}
          {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={pending}
              className="w-fit rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {pending ? "儲存中…" : "儲存草稿"}
            </button>
            <button
              type="submit"
              name="intent"
              value="submit"
              disabled={pending}
              className="w-fit rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
            >
              {pending ? "送出中…" : "送出審核"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
