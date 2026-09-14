"use client";

import { useActionState } from "react";
import { createInviteCode } from "@/lib/actions/inviteCodes";

export function CreateInviteCodeForm() {
  const [state, formAction, pending] = useActionState(createInviteCode, undefined);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="code" className="text-sm font-medium">
          邀請碼(留空自動產生)
        </label>
        <input
          id="code"
          name="code"
          placeholder="例如 GUILD2026"
          className="w-40 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="maxUses" className="text-sm font-medium">
          可使用次數
        </label>
        <input
          id="maxUses"
          name="maxUses"
          type="number"
          min={1}
          defaultValue={1}
          className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="expiresAt" className="text-sm font-medium">
          到期日(選填)
        </label>
        <input
          id="expiresAt"
          name="expiresAt"
          type="date"
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "建立中…" : "建立邀請碼"}
      </button>

      {state && "error" in state && (
        <p className="w-full text-sm text-danger">{state.error}</p>
      )}
      {state && "fieldErrors" in state && (
        <p className="w-full text-sm text-danger">
          {Object.values(state.fieldErrors).flat()[0]}
        </p>
      )}
    </form>
  );
}
