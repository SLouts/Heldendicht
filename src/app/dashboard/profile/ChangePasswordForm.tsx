"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/lib/actions/auth";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="currentPassword" className="text-sm font-medium">
          目前的密碼
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
        {state && "fieldErrors" in state && state.fieldErrors.currentPassword && (
          <p className="text-sm text-danger">{state.fieldErrors.currentPassword[0]}</p>
        )}
      </div>

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
      {state && "success" in state && (
        <p className="text-sm text-success">密碼已修改完成。</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "修改中…" : "修改密碼"}
      </button>
    </form>
  );
}
