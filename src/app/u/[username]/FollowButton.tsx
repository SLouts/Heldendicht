"use client";

import { useState } from "react";
import { followUser, unfollowUser } from "@/lib/actions/follows";

export function FollowButton({
  followeeId,
  username,
  initialFollowing,
}: {
  followeeId: string;
  username: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    const result = following
      ? await unfollowUser(followeeId, username)
      : await followUser(followeeId, username);
    if ("error" in result) {
      setError(result.error);
    } else {
      setFollowing((v) => !v);
    }
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        className={
          "w-fit rounded-lg px-4 py-1.5 text-sm transition disabled:opacity-50 " +
          (following
            ? "border border-border bg-surface hover:bg-muted"
            : "bg-primary text-primary-foreground hover:bg-primary-hover")
        }
      >
        {pending ? "處理中…" : following ? "追蹤中" : "＋ 追蹤"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
