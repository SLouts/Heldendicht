"use client";

import { useActionState } from "react";
import { completePasswordReset } from "@/lib/actions/auth";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    completePasswordReset,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="newPassword" className="text-sm font-medium">
          新密碼
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
        {state && "fieldErrors" in state && state.fieldErrors.newPassword && (
          <p className="text-sm text-danger">{state.fieldErrors.newPassword[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          再輸入一次新密碼
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
        {state && "fieldErrors" in state && state.fieldErrors.confirmPassword && (
          <p className="text-sm text-danger">{state.fieldErrors.confirmPassword[0]}</p>
        )}
      </div>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "設定中…" : "設定新密碼"}
      </button>
    </form>
  );
}
