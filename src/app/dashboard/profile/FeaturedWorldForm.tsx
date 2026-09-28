"use client";

import { useActionState } from "react";
import { updateFeaturedWorld } from "@/lib/actions/profile";

export function FeaturedWorldForm({
  worlds,
  currentFeaturedWorldId,
}: {
  worlds: { id: string; slug: string; name: string }[];
  currentFeaturedWorldId: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateFeaturedWorld,
    undefined,
  );

  if (worlds.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        你目前沒有以 admin 身分主辦任何世界觀,還不能設定精選世界觀。
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3">
      <select
        name="featuredWorldId"
        defaultValue={currentFeaturedWorldId ?? ""}
        className="w-64 rounded-lg border border-border bg-surface px-3 py-2"
      >
        <option value="">不精選</option>
        {worlds.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "儲存中…" : "儲存"}
      </button>
      {state && "error" in state && (
        <p className="w-full text-sm text-danger">{state.error}</p>
      )}
    </form>
  );
}
