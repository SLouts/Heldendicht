"use client";

import { useActionState, useState } from "react";
import {
  requestRelationshipDeletion,
  resolveRelationshipDeletionRequest,
} from "@/lib/actions/relationships";

/**
 * 關係線刪除——不再開放直接硬刪除,一律走「申請 + staff 審核」:
 * 有編輯權的人(creator/staff/相關角色擁有者)可以申請,世界觀 staff
 * 核准後才會真的刪除(見 resolve_relationship_deletion_request RPC)。
 */
export function RelationshipDeletionForm({
  relationshipId,
  worldId,
  worldSlug,
  relationshipSummary,
  canRequest,
  isStaff,
  pendingRequest,
}: {
  relationshipId: string;
  worldId: string;
  worldSlug: string;
  relationshipSummary: string;
  canRequest: boolean;
  isStaff: boolean;
  pendingRequest: { id: string; reason: string | null; requesterLabel: string } | null;
}) {
  const [state, formAction, pending] = useActionState(
    requestRelationshipDeletion,
    undefined,
  );
  const [resolving, setResolving] = useState(false);

  async function handleResolve(approve: boolean) {
    if (!pendingRequest) return;
    setResolving(true);
    try {
      await resolveRelationshipDeletionRequest(pendingRequest.id, worldSlug, approve);
    } finally {
      setResolving(false);
    }
  }

  if (pendingRequest) {
    return (
      <div className="mt-4 rounded-lg border border-badge-pending-fg/40 bg-badge-pending-bg p-3 text-sm">
        <p className="font-medium text-badge-pending-fg">已有待審核的刪除申請</p>
        <p className="mt-1 text-badge-pending-fg">
          {pendingRequest.requesterLabel} 提出
          {pendingRequest.reason && <>:{pendingRequest.reason}</>}
        </p>
        {isStaff && (
          <div className="mt-2 flex gap-2">
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
        )}
      </div>
    );
  }

  if (!canRequest) return null;

  return (
    <form action={formAction} className="mt-4 flex max-w-md flex-col gap-2">
      <input type="hidden" name="relationshipId" value={relationshipId} />
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />
      <input type="hidden" name="relationshipSummary" value={relationshipSummary} />
      <label htmlFor="deletion-reason" className="text-sm text-muted-foreground">
        申請刪除這條關係線(需要 staff 核准才會真的刪除)
      </label>
      <textarea
        id="deletion-reason"
        name="reason"
        rows={2}
        placeholder="說明一下為什麼要刪除(選填)"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
      />
      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit text-sm text-danger underline disabled:opacity-50"
      >
        {pending ? "送出中…" : "申請刪除"}
      </button>
    </form>
  );
}
