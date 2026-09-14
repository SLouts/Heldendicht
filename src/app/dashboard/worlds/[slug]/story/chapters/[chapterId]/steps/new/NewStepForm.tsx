"use client";

import { useActionState } from "react";
import { createStep } from "@/lib/actions/story";

export function NewStepForm({
  chapterId,
  worldSlug,
  nodeOptions,
  characterOptions,
}: {
  chapterId: string;
  worldSlug: string;
  nodeOptions: { id: string; title: string; node_type: string }[];
  characterOptions: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(createStep, undefined);

  return (
    <form action={formAction} className="mt-6 flex max-w-xl flex-col gap-4">
      <input type="hidden" name="chapterId" value={chapterId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <div className="flex flex-col gap-1">
        <label htmlFor="nodeId" className="text-sm font-medium">
          這段登場的節點
        </label>
        <select
          id="nodeId"
          name="nodeId"
          required
          defaultValue=""
          className="rounded-lg border border-border bg-surface px-3 py-2"
        >
          <option value="" disabled>
            選擇節點
          </option>
          {nodeOptions.map((node) => (
            <option key={node.id} value={node.id}>
              {node.title}({node.node_type})
            </option>
          ))}
        </select>
        {state && "fieldErrors" in state && state.fieldErrors.nodeId && (
          <p className="text-sm text-danger">{state.fieldErrors.nodeId[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="orderIndex" className="text-sm font-medium">
            順序
          </label>
          <input
            id="orderIndex"
            name="orderIndex"
            type="number"
            defaultValue={1}
            required
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="povCharacterId" className="text-sm font-medium">
            視角(選填)
          </label>
          <select
            id="povCharacterId"
            name="povCharacterId"
            defaultValue=""
            className="rounded-lg border border-border bg-surface px-3 py-2"
          >
            <option value="">(不指定)</option>
            {characterOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="customText" className="text-sm font-medium">
          這一段的自訂文案(選填)
        </label>
        <textarea
          id="customText"
          name="customText"
          rows={5}
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
        {pending ? "建立中…" : "新增段落"}
      </button>
    </form>
  );
}
