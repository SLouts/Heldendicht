"use client";

import { useState } from "react";
import { resolveWorldDeletionRequest } from "@/lib/actions/worlds";

export function ResolveWorldDeletionForm({ requestId }: { requestId: string }) {
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResolve(approve: boolean) {
    setResolving(true);
    setError(null);
    try {
      await resolveWorldDeletionRequest(requestId, approve);
    } catch (err) {
      setError(err instanceof Error ? err.message : "處理失敗,請稍後再試");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={resolving}
          onClick={() => void handleResolve(true)}
          className="rounded-lg bg-danger px-3 py-1.5 text-sm text-danger-foreground transition hover:bg-danger-hover disabled:opacity-50"
        >
          核准刪除
        </button>
        <button
          type="button"
          disabled={resolving}
          onClick={() => void handleResolve(false)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          駁回申請
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
