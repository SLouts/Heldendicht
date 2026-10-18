"use client";

import { useActionState, useState } from "react";
import { createReport } from "@/lib/actions/reports";
import type { ReportReasonCategory } from "@/lib/supabase/database.types";
import { REPORT_REASON_CATEGORY_LABEL } from "@/lib/reportLabels";

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
  const [reasonCategory, setReasonCategory] = useState<ReportReasonCategory>("infringement");

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

        <label htmlFor="reasonCategory" className="text-sm font-medium">
          檢舉理由類別
        </label>
        <select
          id="reasonCategory"
          name="reasonCategory"
          value={reasonCategory}
          onChange={(e) => setReasonCategory(e.target.value as ReportReasonCategory)}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
        >
          {(Object.keys(REPORT_REASON_CATEGORY_LABEL) as ReportReasonCategory[]).map((key) => (
            <option key={key} value={key}>
              {REPORT_REASON_CATEGORY_LABEL[key]}
            </option>
          ))}
        </select>
        {state && "fieldErrors" in state && state.fieldErrors.reasonCategory && (
          <p className="text-sm text-danger">{state.fieldErrors.reasonCategory[0]}</p>
        )}

        <textarea
          name="reason"
          rows={3}
          required
          placeholder={
            reasonCategory === "other"
              ? "請具體描述檢舉原因(至少 10 個字)"
              : "請說明檢舉原因"
          }
          className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
        />
        {state && "fieldErrors" in state && state.fieldErrors.reason && (
          <p className="text-sm text-danger">{state.fieldErrors.reason[0]}</p>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isAnonymous" />
          對這個世界觀的主辦/編輯匿名(站務一律看得到檢舉人身分)
        </label>

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
