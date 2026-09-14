"use client";

import { useActionState } from "react";
import { inviteMemberByEmail } from "@/lib/actions/memberships";

export function InviteMemberForm({
  worldId,
  worldSlug,
}: {
  worldId: string;
  worldSlug: string;
}) {
  const [state, formAction, pending] = useActionState(
    inviteMemberByEmail,
    undefined,
  );

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          對方的 Email(必須已經註冊過帳號)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-64 rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium">
          角色
        </label>
        <select
          id="role"
          name="role"
          defaultValue="member"
          className="rounded-lg border border-border bg-surface px-3 py-2"
        >
          <option value="member">一般成員</option>
          <option value="editor">編輯</option>
          <option value="admin">主辦</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "邀請中…" : "加入這個世界觀"}
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
