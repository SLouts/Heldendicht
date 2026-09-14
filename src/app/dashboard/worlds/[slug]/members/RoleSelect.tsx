"use client";

import { useState, useTransition } from "react";
import { updateMemberRole } from "@/lib/actions/memberships";

export function RoleSelect({
  membershipId,
  worldSlug,
  currentRole,
}: {
  membershipId: string;
  worldSlug: string;
  currentRole: "admin" | "editor" | "member";
}) {
  const [role, setRole] = useState(currentRole);
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={role}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as "admin" | "editor" | "member";
        setRole(next);
        startTransition(async () => {
          await updateMemberRole(membershipId, worldSlug, next);
        });
      }}
      className="rounded-lg border border-border bg-surface px-2 py-1 text-sm disabled:opacity-50"
    >
      <option value="member">一般成員</option>
      <option value="editor">編輯</option>
      <option value="admin">主辦</option>
    </select>
  );
}
