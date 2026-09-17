"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";

export function ForgotPasswordForm({ expired }: { expired: boolean }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    undefined,
  );

  if (state && "success" in state) {
    return (
      <div>
        <p className="mt-4 text-sm">
          如果這個 Email 有註冊過,我們已經寄出重設密碼的信,請去信箱收信。
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          沒看到信的話,先檢查一下垃圾郵件匣;如果還是沒有,也可能是短時間內申請太多次觸發了寄信限制,稍等幾分鐘後再試一次看看。
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm underline">
          回登入頁
        </Link>
      </div>
    );
  }

  return (
    <div>
      {expired && (
        <p className="mt-4 text-sm text-danger">
          重設連結已經失效或用過了,請重新申請一次。
        </p>
      )}

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
          {state && "fieldErrors" in state && state.fieldErrors.email && (
            <p className="text-sm text-danger">{state.fieldErrors.email[0]}</p>
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
          {pending ? "送出中…" : "寄送重設密碼信"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        想起密碼了?
        <Link href="/login" className="ml-1 underline">
          回登入頁
        </Link>
      </p>
    </div>
  );
}
