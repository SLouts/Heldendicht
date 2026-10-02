"use client";

import { useActionState } from "react";
import { updateChapter } from "@/lib/actions/story";

export function EditChapterForm({
  chapterId,
  worldSlug,
  title,
  description,
  yearStart,
  yearStartMonth,
  yearStartDay,
  yearEnd,
  yearEndMonth,
  yearEndDay,
}: {
  chapterId: string;
  worldSlug: string;
  title: string;
  description: string;
  yearStart: number | null;
  yearStartMonth: number | null;
  yearStartDay: number | null;
  yearEnd: number | null;
  yearEndMonth: number | null;
  yearEndDay: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateChapter, undefined);

  return (
    <form action={formAction} className="mt-4 flex max-w-xl flex-col gap-4">
      <input type="hidden" name="chapterId" value={chapterId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          章節名稱
        </label>
        <input
          id="title"
          name="title"
          defaultValue={title}
          required
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="yearStart" className="text-sm font-medium">
          起始年份
        </label>
        <div className="flex gap-2">
          <input
            id="yearStart"
            name="yearStart"
            type="number"
            placeholder="年"
            defaultValue={yearStart ?? undefined}
            required
            className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
          />
          <input
            name="yearStartMonth"
            type="number"
            placeholder="月(選填)"
            defaultValue={yearStartMonth ?? undefined}
            className="w-28 rounded-lg border border-border bg-surface px-3 py-2"
          />
          <input
            name="yearStartDay"
            type="number"
            placeholder="日(選填)"
            defaultValue={yearStartDay ?? undefined}
            className="w-28 rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>
        {state && "fieldErrors" in state &&
          (state.fieldErrors.yearStart ||
            state.fieldErrors.yearStartMonth ||
            state.fieldErrors.yearStartDay) && (
            <p className="text-sm text-danger">
              {(state.fieldErrors.yearStart ??
                state.fieldErrors.yearStartMonth ??
                state.fieldErrors.yearStartDay)?.[0]}
            </p>
          )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="yearEnd" className="text-sm font-medium">
          結束年份(選填)
        </label>
        <div className="flex gap-2">
          <input
            id="yearEnd"
            name="yearEnd"
            type="number"
            placeholder="年"
            defaultValue={yearEnd ?? undefined}
            className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
          />
          <input
            name="yearEndMonth"
            type="number"
            placeholder="月(選填)"
            defaultValue={yearEndMonth ?? undefined}
            className="w-28 rounded-lg border border-border bg-surface px-3 py-2"
          />
          <input
            name="yearEndDay"
            type="number"
            placeholder="日(選填)"
            defaultValue={yearEndDay ?? undefined}
            className="w-28 rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>
        {state && "fieldErrors" in state &&
          (state.fieldErrors.yearEnd ||
            state.fieldErrors.yearEndMonth ||
            state.fieldErrors.yearEndDay) && (
            <p className="text-sm text-danger">
              {(state.fieldErrors.yearEnd ??
                state.fieldErrors.yearEndMonth ??
                state.fieldErrors.yearEndDay)?.[0]}
            </p>
          )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          簡介
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={description}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "儲存中…" : "儲存章節資訊"}
      </button>
    </form>
  );
}
