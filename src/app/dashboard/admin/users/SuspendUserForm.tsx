"use client";

import { suspendUser } from "@/lib/actions/adminUsers";

/**
 * 停權表單——自己不能停權自己(按鈕在上層就直接不會渲染這個元件,見
 * page.tsx),但「站務停權另一個站務」風險比停一般使用者大,這裡多加
 * 一次 confirm() 當最後一道防線,不是只靠伺服器端擋。
 */
export function SuspendUserForm({
  userId,
  revalidatePathStr,
  isTargetSiteAdmin,
}: {
  userId: string;
  revalidatePathStr: string;
  isTargetSiteAdmin: boolean;
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (isTargetSiteAdmin) {
      const confirmed = window.confirm(
        "這個帳號也是站務管理員,確定要停權嗎?",
      );
      if (!confirmed) {
        e.preventDefault();
      }
    }
  }

  return (
    <form
      action={suspendUser.bind(null, userId, revalidatePathStr)}
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        name="reason"
        placeholder="停權原因(選填)"
        className="w-56 rounded-lg border border-border bg-background px-2 py-1 text-xs"
      />
      <button className="rounded-lg bg-danger px-3 py-1.5 text-xs text-danger-foreground transition hover:bg-danger-hover">
        停權
      </button>
    </form>
  );
}
