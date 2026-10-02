"use client";

import { useActionState } from "react";
import { updateChapterParticipants } from "@/lib/actions/story";

/**
 * 「副本」參與角色勾選表單——只有世界觀 staff 看得到(呼叫端已經檢查
 * canManage),整批替換這個章節的參與名單,不逐條新增/刪除。
 */
export function ChapterParticipantsForm({
  chapterId,
  worldSlug,
  characterOptions,
  selectedCharacterIds,
}: {
  chapterId: string;
  worldSlug: string;
  characterOptions: { id: string; title: string }[];
  selectedCharacterIds: string[];
}) {
  const [state, formAction, pending] = useActionState(
    updateChapterParticipants,
    undefined,
  );

  return (
    <form action={formAction} className="mt-4 flex max-w-xl flex-col gap-2">
      <input type="hidden" name="chapterId" value={chapterId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />
      <p className="text-sm font-medium">參與角色(這個章節是哪些角色一起參與的「副本」)</p>
      {characterOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">這個世界觀目前還沒有角色節點。</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {characterOptions.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="characterNodeIds"
                value={c.id}
                defaultChecked={selectedCharacterIds.includes(c.id)}
              />
              {c.title}
            </label>
          ))}
        </div>
      )}
      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-fit rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? "儲存中…" : "儲存參與名單"}
      </button>
    </form>
  );
}
