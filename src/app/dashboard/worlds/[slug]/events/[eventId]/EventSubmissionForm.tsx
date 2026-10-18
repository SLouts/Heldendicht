"use client";

import { useActionState } from "react";
import { submitEventEntryContent } from "@/lib/actions/events";
import { formatTaipeiDateTime } from "@/lib/taipeiTime";
import { isPastDeadline } from "@/lib/worldEvents";

export function EventSubmissionForm({
  entryId,
  eventId,
  worldSlug,
  content,
  submittedAt,
  submissionDeadline,
}: {
  entryId: string;
  eventId: string;
  worldSlug: string;
  content: string;
  submittedAt: string | null;
  submissionDeadline: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitEventEntryContent, undefined);
  const isOverdue = isPastDeadline(submissionDeadline);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />
      <textarea
        name="content"
        rows={4}
        defaultValue={content}
        placeholder="繳交內容"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      {submissionDeadline && (
        <p className={`text-xs ${isOverdue && !content ? "text-danger" : "text-muted-foreground"}`}>
          繳件期限:{formatTaipeiDateTime(submissionDeadline)}
          {isOverdue && !content && "(已逾期,請盡快補交)"}
        </p>
      )}
      {submittedAt && (
        <p className="text-xs text-muted-foreground">
          上次繳交於 {formatTaipeiDateTime(submittedAt)}
        </p>
      )}
      {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}
      {state && "fieldErrors" in state && (
        <p className="text-sm text-danger">{Object.values(state.fieldErrors).flat()[0]}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "送出中…" : "繳交 / 更新內容"}
      </button>
    </form>
  );
}
