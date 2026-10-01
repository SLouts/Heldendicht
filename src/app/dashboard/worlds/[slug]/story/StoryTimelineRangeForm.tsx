"use client";

import { useActionState } from "react";
import { updateStoryTimelineRange } from "@/lib/actions/story";

/**
 * 只有世界觀 admin 看得到(worlds_update_admin policy 只開放 admin,不是
 * 全體 staff)——設定企劃時間軸橫軸要呈現的起迄年份,跟每個章節各自的
 * 起迄年份是兩件事:這裡是軸線本身的顯示範圍,不設定就自動依目前的
 * 章節/角色時間點資料算範圍。
 */
export function StoryTimelineRangeForm({
  worldId,
  worldSlug,
  yearStart,
  yearEnd,
}: {
  worldId: string;
  worldSlug: string;
  yearStart: number | null;
  yearEnd: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateStoryTimelineRange,
    undefined,
  );

  return (
    <details className="mt-4 rounded-lg border border-dashed border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        設定時間軸顯示範圍
        {yearStart != null && yearEnd != null && (
          <span className="ml-1.5 font-normal text-muted-foreground">
            (目前:{yearStart} ~ {yearEnd})
          </span>
        )}
      </summary>
      <form action={formAction} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="worldId" value={worldId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <p className="text-xs text-muted-foreground">
          讓這條時間軸呈現出正確的歷史尺度,不會被目前實際寫的章節「擠」成一小段——例如世界觀有一千年歷史,即使目前只寫了其中一段章節,也可以把範圍設定成涵蓋整個一千年。兩欄都留空會清除設定,退回自動依資料範圍顯示。
        </p>
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="rangeYearStart" className="text-xs text-muted-foreground">
              起始年份
            </label>
            <input
              id="rangeYearStart"
              name="yearStart"
              type="number"
              defaultValue={yearStart ?? undefined}
              className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            />
            {state && "fieldErrors" in state && state.fieldErrors.yearStart && (
              <p className="text-sm text-danger">{state.fieldErrors.yearStart[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rangeYearEnd" className="text-xs text-muted-foreground">
              結束年份
            </label>
            <input
              id="rangeYearEnd"
              name="yearEnd"
              type="number"
              defaultValue={yearEnd ?? undefined}
              className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            />
            {state && "fieldErrors" in state && state.fieldErrors.yearEnd && (
              <p className="text-sm text-danger">{state.fieldErrors.yearEnd[0]}</p>
            )}
          </div>
        </div>
        {state && "error" in state && (
          <p className="text-sm text-danger">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          {pending ? "儲存中…" : "儲存"}
        </button>
      </form>
    </details>
  );
}
