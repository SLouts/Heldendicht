"use client";

import { useActionState } from "react";
import { createChapter } from "@/lib/actions/story";

export function NewChapterForm({
  worldId,
  worldSlug,
}: {
  worldId: string;
  worldSlug: string;
}) {
  const [state, formAction, pending] = useActionState(createChapter, undefined);

  return (
    <form action={formAction} className="mt-6 flex max-w-xl flex-col gap-4">
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          章節名稱
        </label>
        <input
          id="title"
          name="title"
          required
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
        {state && "fieldErrors" in state && state.fieldErrors.title && (
          <p className="text-sm text-danger">{state.fieldErrors.title[0]}</p>
        )}
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
            required
            className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
          />
          <input
            name="yearStartMonth"
            type="number"
            placeholder="月(選填)"
            className="w-28 rounded-lg border border-border bg-surface px-3 py-2"
          />
          <input
            name="yearStartDay"
            type="number"
            placeholder="日(選填)"
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
            className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
          />
          <input
            name="yearEndMonth"
            type="number"
            placeholder="月(選填)"
            className="w-28 rounded-lg border border-border bg-surface px-3 py-2"
          />
          <input
            name="yearEndDay"
            type="number"
            placeholder="日(選填)"
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
      <p className="-mt-2 text-xs text-muted-foreground">
        用世界觀自己的曆法填年份即可(可以是負數),月/日都選填,填越細同一年內的事件在時間軸上越能分出先後。只填起始年份代表單一時間點,兩個都填代表橫跨一段年份。
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          簡介(選填)
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "建立中…" : "建立章節"}
      </button>
    </form>
  );
}
