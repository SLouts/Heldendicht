"use client";

import { useActionState } from "react";
import { updateProfileDetails } from "@/lib/actions/profile";

export function ProfileDetailsForm({
  displayName,
  username,
  bio,
}: {
  displayName: string | null;
  username: string | null;
  bio: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileDetails,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium">
          暱稱
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={displayName ?? ""}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium">
          網址代號(公開個人頁面的網址,例如 /u/your-name)
        </label>
        <input
          id="username"
          name="username"
          defaultValue={username ?? ""}
          placeholder="留空表示還沒有公開頁面"
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="bio" className="text-sm font-medium">
          自我介紹
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={6}
          defaultValue={bio ?? ""}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      {state && "fieldErrors" in state && (
        <p className="text-sm text-danger">
          {Object.values(state.fieldErrors).flat()[0]}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "儲存中…" : "儲存"}
      </button>
    </form>
  );
}
