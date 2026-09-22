"use client";

import { useState } from "react";
import { reviewNode } from "@/lib/actions/nodes";

/**
 * staff 審核節點用的表單——核准/駁回/(已核准的話)打回審核中,搭配一個
 * 選填的審核意見留言給建立者看。決定的動作是直接呼叫 Server Action,
 * 不是傳統 <form action> 綁定,因為要一起把 textarea 的內容送出去。
 */
export function NodeReviewForm({
  nodeId,
  worldSlug,
  nodeSlug,
  status,
  existingNote,
}: {
  nodeId: string;
  worldSlug: string;
  nodeSlug: string;
  status: "pending" | "approved" | "rejected";
  existingNote: string | null;
}) {
  const [note, setNote] = useState(existingNote ?? "");
  const [pending, setPending] = useState(false);

  async function handle(decision: "approved" | "rejected" | "pending") {
    setPending(true);
    try {
      await reviewNode(nodeId, worldSlug, nodeSlug, decision, note);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <label htmlFor="review-note" className="text-sm font-medium">
        審核意見(選填,會顯示給建立者看)
      </label>
      <textarea
        id="review-note"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="例如「這段設定跟世界觀衝突,請修改」"
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        {status !== "approved" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void handle("approved")}
            className="rounded-lg bg-success px-3 py-1.5 text-sm text-success-foreground transition hover:bg-success-hover disabled:opacity-50"
          >
            核准
          </button>
        )}
        {status !== "rejected" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void handle("rejected")}
            className="rounded-lg bg-danger px-3 py-1.5 text-sm text-danger-foreground transition hover:bg-danger-hover disabled:opacity-50"
          >
            駁回
          </button>
        )}
        {status === "approved" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void handle("pending")}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            打回審核中
          </button>
        )}
      </div>
    </div>
  );
}
