"use client";

import { useActionState } from "react";
import { createChapter } from "@/lib/actions/story";

export function NewChapterForm({
  worldId,
  worldSlug,
  scope,
  characterId,
  characterTitle,
}: {
  worldId: string;
  worldSlug: string;
  scope: "official" | "character";
  characterId: string;
  characterTitle?: string;
}) {
  const [state, formAction, pending] = useActionState(createChapter, undefined);

  return (
    <form action={formAction} className="mt-6 flex max-w-xl flex-col gap-4">
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="characterId" value={characterId} />

      {scope === "character" && (
        <p className="text-sm text-muted-foreground">
          屬於角色:<span className="font-medium">{characterTitle}</span>
        </p>
      )}

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
        <label htmlFor="orderIndex" className="text-sm font-medium">
          順序(數字越小越前面)
        </label>
        <input
          id="orderIndex"
          name="orderIndex"
          type="number"
          defaultValue={1}
          required
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

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
