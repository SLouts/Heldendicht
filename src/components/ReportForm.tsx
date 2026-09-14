"use client";

import { useActionState } from "react";
import { createReport } from "@/lib/actions/reports";

export function ReportForm({
  targetType,
  targetId,
  redirectPath,
}: {
  targetType: "node" | "relationship";
  targetId: string;
  redirectPath: string;
}) {
  const [state, formAction, pending] = useActionState(createReport, undefined);

  if (state && "success" in state) {
    return (
      <p className="mt-4 text-sm text-success">
        已送出檢舉,主辦會盡快處理。
      </p>
    );
  }

  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm text-muted-foreground hover:underline">
        檢舉
      </summary>
      <form action={formAction} className="mt-2 flex max-w-md flex-col gap-2">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="redirectPath" value={redirectPath} />
        <textarea
          name="reason"
          rows={3}
          required
          placeholder="請說明檢舉原因"
          className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
        />
        {state && "fieldErrors" in state && state.fieldErrors.reason && (
          <p className="text-sm text-danger">{state.fieldErrors.reason[0]}</p>
        )}
        {state && "error" in state && (
          <p className="text-sm text-danger">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-danger px-3 py-1.5 text-sm text-danger-foreground transition hover:bg-danger-hover disabled:opacity-50"
        >
          {pending ? "送出中…" : "送出檢舉"}
        </button>
      </form>
    </details>
  );
}
