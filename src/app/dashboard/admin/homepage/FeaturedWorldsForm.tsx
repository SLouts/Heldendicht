"use client";

import { useActionState } from "react";
import { updateFeaturedWorlds } from "@/lib/actions/siteFeatureCards";

/**
 * 首頁 What's New「勾選公開世界觀」清單——整批替換(見
 * updateFeaturedWorlds),跟 ChapterParticipantsForm 同一套慣例。只列出
 * is_public 的世界觀供勾選(呼叫端已經篩過),不會出現私人世界觀選項。
 */
export function FeaturedWorldsForm({
  worldOptions,
  selectedWorldIds,
}: {
  worldOptions: { id: string; name: string }[];
  selectedWorldIds: string[];
}) {
  const [state, formAction, pending] = useActionState(updateFeaturedWorlds, undefined);

  return (
    <form action={formAction} className="mt-4 flex max-w-xl flex-col gap-2">
      {worldOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">目前還沒有任何公開世界觀。</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {worldOptions.map((w) => (
            <label key={w.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="worldIds"
                value={w.id}
                defaultChecked={selectedWorldIds.includes(w.id)}
              />
              {w.name}
            </label>
          ))}
        </div>
      )}
      {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-fit rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? "儲存中…" : "儲存展示名單"}
      </button>
    </form>
  );
}
