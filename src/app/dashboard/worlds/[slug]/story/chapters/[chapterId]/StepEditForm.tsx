"use client";

import { useActionState } from "react";
import { updateStep, deleteStep } from "@/lib/actions/story";

export function StepEditForm({
  stepId,
  chapterId,
  worldSlug,
  orderIndex,
  customText,
  povCharacterId,
  characterOptions,
}: {
  stepId: string;
  chapterId: string;
  worldSlug: string;
  orderIndex: number;
  customText: string;
  povCharacterId: string;
  characterOptions: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(updateStep, undefined);

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="stepId" value={stepId} />
        <input type="hidden" name="chapterId" value={chapterId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />

        <div className="flex gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">順序</label>
            <input
              name="orderIndex"
              type="number"
              defaultValue={orderIndex}
              required
              className="w-20 rounded-lg border border-border bg-surface px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium">視角(選填)</label>
            <select
              name="povCharacterId"
              defaultValue={povCharacterId}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
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
          <label className="text-xs font-medium">這一段的自訂文案</label>
          <textarea
            name="customText"
            rows={3}
            defaultValue={customText}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            用 [[節點名稱]] 或 [顯示文字](網址) 就能連結到任何節點。
          </p>
        </div>

        {state && "error" in state && (
          <p className="text-sm text-danger">{state.error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="w-fit rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "儲存中…" : "儲存"}
          </button>
        </div>
      </form>
      <form action={deleteStep.bind(null, stepId, chapterId, worldSlug)} className="mt-2">
        <button className="text-xs text-danger underline">刪除這一段</button>
      </form>
    </div>
  );
}
