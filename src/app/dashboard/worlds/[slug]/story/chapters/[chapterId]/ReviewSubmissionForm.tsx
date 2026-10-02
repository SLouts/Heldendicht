"use client";

import { useActionState } from "react";
import { reviewChapterSubmission } from "@/lib/actions/story";

/**
 * staff 審核一筆送審中的「副本」投稿——核准不需要留言,退回要求必填
 * 退回原因(見 reviewChapterSubmission 的 zod refine)。
 */
export function ReviewSubmissionForm({
  submissionId,
  chapterId,
  worldSlug,
}: {
  submissionId: string;
  chapterId: string;
  worldSlug: string;
}) {
  const [state, formAction, pending] = useActionState(reviewChapterSubmission, undefined);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="chapterId" value={chapterId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <textarea
        name="reviewNote"
        rows={2}
        placeholder="退回原因(核准不需要填寫)"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      {state && "fieldErrors" in state && state.fieldErrors.reviewNote && (
        <p className="text-sm text-danger">{state.fieldErrors.reviewNote[0]}</p>
      )}
      {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          disabled={pending}
          className="w-fit rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          核准
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className="w-fit rounded-lg border border-border px-3 py-1.5 text-sm text-danger hover:bg-muted disabled:opacity-50"
        >
          退回
        </button>
      </div>
    </form>
  );
}
