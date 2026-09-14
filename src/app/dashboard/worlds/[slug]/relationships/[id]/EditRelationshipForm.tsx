"use client";

import { useActionState } from "react";
import { updateRelationship } from "@/lib/actions/relationships";

export function EditRelationshipForm({
  relationshipId,
  worldSlug,
  label,
  labelReverse,
  description,
}: {
  relationshipId: string;
  worldSlug: string;
  label: string;
  labelReverse: string;
  description: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateRelationship,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="relationshipId" value={relationshipId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="label" className="text-sm font-medium">
            A → B 稱呼
          </label>
          <input
            id="label"
            name="label"
            defaultValue={label}
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="labelReverse" className="text-sm font-medium">
            B → A 稱呼
          </label>
          <input
            id="labelReverse"
            name="labelReverse"
            defaultValue={labelReverse}
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          描述
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
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
        {pending ? "儲存中…" : "儲存"}
      </button>
    </form>
  );
}
