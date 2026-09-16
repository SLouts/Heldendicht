"use client";

import { useState } from "react";
import { unfollowUser } from "@/lib/actions/follows";

export function UnfollowButton({
  followeeId,
  username,
}: {
  followeeId: string;
  username?: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await unfollowUser(followeeId, username);
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={pending}
      className="text-xs text-danger underline disabled:opacity-50"
    >
      {pending ? "處理中…" : "取消追蹤"}
    </button>
  );
}
