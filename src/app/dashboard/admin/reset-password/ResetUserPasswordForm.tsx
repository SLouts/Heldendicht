"use client";

import { useActionState } from "react";
import { adminResetUserPassword } from "@/lib/actions/adminUsers";

export function ResetUserPasswordForm() {
  const [state, formAction, pending] = useActionState(
    adminResetUserPassword,
    undefined,
  );

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="identifier" className="text-sm font-medium">
            使用者(Email 或使用者名稱)
          </label>
          <input
            id="identifier"
            name="identifier"
            required
            className="w-56 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="newPassword" className="text-sm font-medium">
            新密碼
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="text"
            required
            minLength={8}
            placeholder="至少 8 個字元"
            className="w-56 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "設定中…" : "設定新密碼"}
        </button>
      </form>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      {state && "fieldErrors" in state && (
        <p className="text-sm text-danger">
          {Object.values(state.fieldErrors).flat()[0]}
        </p>
      )}
      {state && "success" in state && (
        <p className="text-sm text-success">
          已經把 <span className="font-medium">{state.identifier}</span> 的密碼改成{" "}
          <span className="font-mono">{state.newPassword}</span>
          ,把這組密碼告訴對方,請對方登入後盡快自行修改。
        </p>
      )}
    </div>
  );
}
