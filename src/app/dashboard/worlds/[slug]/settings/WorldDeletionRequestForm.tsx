"use client";

import { useActionState } from "react";
import { requestWorldDeletion } from "@/lib/actions/worlds";

/**
 * 世界觀刪除——連 admin 都不能直接刪,只能在這裡提出申請,交給站務
 * (site_admin)審核。核准後才會真的刪除(見 resolve_world_deletion_request RPC)。
 */
export function WorldDeletionRequestForm({
  worldId,
  worldSlug,
  worldName,
  pendingRequest,
}: {
  worldId: string;
  worldSlug: string;
  worldName: string;
  pendingRequest: { reason: string } | null;
}) {
  const [state, formAction, pending] = useActionState(
    requestWorldDeletion,
    undefined,
  );

  if (pendingRequest) {
    return (
      <div className="mt-4 rounded-lg border border-badge-pending-fg/40 bg-badge-pending-bg p-3 text-sm">
        <p className="font-medium text-badge-pending-fg">已提出刪除申請,等待站務審核中</p>
        {pendingRequest.reason && (
          <p className="mt-1 text-badge-pending-fg">原因:{pendingRequest.reason}</p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-4 flex max-w-md flex-col gap-2">
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />
      <input type="hidden" name="worldName" value={worldName} />
      <label htmlFor="world-deletion-reason" className="text-sm text-muted-foreground">
        申請刪除這個世界觀(需要站務核准才會真的刪除,無法復原)
      </label>
      <textarea
        id="world-deletion-reason"
        name="reason"
        rows={2}
        required
        placeholder="說明一下為什麼要刪除這個世界觀"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
      />
      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      {state && "fieldErrors" in state && state.fieldErrors.reason && (
        <p className="text-sm text-danger">{state.fieldErrors.reason[0]}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg border border-danger px-3 py-1.5 text-sm text-danger transition hover:bg-danger hover:text-danger-foreground disabled:opacity-50"
      >
        {pending ? "送出中…" : "申請刪除世界觀"}
      </button>
    </form>
  );
}
