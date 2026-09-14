"use client";

import { useActionState } from "react";
import { updateChapter } from "@/lib/actions/story";

export function EditChapterForm({
  chapterId,
  worldSlug,
  title,
  description,
  orderIndex,
}: {
  chapterId: string;
  worldSlug: string;
  title: string;
  description: string;
  orderIndex: number;
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
        <label htmlFor="orderIndex" className="text-sm font-medium">
          順序
        </label>
        <input
          id="orderIndex"
          name="orderIndex"
          type="number"
          defaultValue={orderIndex}
          required
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2"
        />
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
