"use client";

import { useActionState } from "react";
import { createNode } from "@/lib/actions/nodes";

export function NewNodeForm({
  worldId,
  worldSlug,
}: {
  worldId: string;
  worldSlug: string;
}) {
  const [state, formAction, pending] = useActionState(createNode, undefined);

  return (
    <form action={formAction} className="mt-6 flex max-w-xl flex-col gap-4">
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <div className="flex flex-col gap-1">
        <label htmlFor="nodeType" className="text-sm font-medium">
          類型
        </label>
        <select
          id="nodeType"
          name="nodeType"
          defaultValue="location"
          className="w-40 rounded-lg border border-border bg-surface px-3 py-2"
        >
          <option value="location">地點</option>
          <option value="item">物產</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          標題
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
        <label htmlFor="slug" className="text-sm font-medium">
          slug(網址用)
        </label>
        <input
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9-]+"
          className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
        />
        {state && "fieldErrors" in state && state.fieldErrors.slug && (
          <p className="text-sm text-danger">{state.fieldErrors.slug[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="content" className="text-sm font-medium">
          內文
        </label>
        <textarea
          id="content"
          name="content"
          rows={8}
          placeholder="可以用 [[名稱]] 建立 WikiLink"
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="editMode" className="text-sm font-medium">
          編輯權限
        </label>
        <select
          id="editMode"
          name="editMode"
          defaultValue="owner_only"
          className="w-56 rounded-lg border border-border bg-surface px-3 py-2"
        >
          <option value="owner_only">僅自己可改</option>
          <option value="collaborative">開放社群共筆</option>
        </select>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "建立中…" : "建立節點"}
      </button>
    </form>
  );
}
