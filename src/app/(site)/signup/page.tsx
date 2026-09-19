"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signup } from "@/lib/actions/auth";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);
  // Email/邀請碼刻意做成 controlled input:React 在 form action 送出後
  // 會重置 uncontrolled 欄位(即使送出失敗也一樣),沒特別處理的話,
  // 邀請碼打錯一次使用者就要重打一次 email,體驗很差。密碼欄位維持
  // uncontrolled、送出後清空——這是多數網站的常見/預期行為。
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">註冊</h1>

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
          {state && "fieldErrors" in state && state.fieldErrors.email && (
            <p className="text-sm text-danger">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            密碼
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
          {state && "fieldErrors" in state && state.fieldErrors.password && (
            <p className="text-sm text-danger">
              {state.fieldErrors.password[0]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="inviteCode" className="text-sm font-medium">
            邀請碼
          </label>
          <input
            id="inviteCode"
            name="inviteCode"
            type="text"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
          {state && "fieldErrors" in state && state.fieldErrors.inviteCode && (
            <p className="text-sm text-danger">
              {state.fieldErrors.inviteCode[0]}
            </p>
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
          {pending ? "註冊中…" : "註冊"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        已經有帳號?
        <Link href="/login" className="ml-1 underline">
          登入
        </Link>
      </p>
    </div>
  );
}
