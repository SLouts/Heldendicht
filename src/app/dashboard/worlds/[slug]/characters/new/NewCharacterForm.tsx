"use client";

import { useActionState } from "react";
import { createCharacter } from "@/lib/actions/characters";

export function NewCharacterForm({
  worldId,
  worldSlug,
  characterFields,
  categories,
}: {
  worldId: string;
  worldSlug: string;
  characterFields: { id: string; label: string }[];
  categories: { id: string; name: string; accepts_submissions: boolean }[];
}) {
  const [state, formAction, pending] = useActionState(
    createCharacter,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 flex max-w-xl flex-col gap-4">
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <div className="flex flex-col gap-1">
        <label htmlFor="characterType" className="text-sm font-medium">
          類型
        </label>
        <select
          id="characterType"
          name="characterType"
          defaultValue="pc"
          className="w-48 rounded-lg border border-border bg-surface px-3 py-2"
        >
          <option value="pc">PC(可遊玩角色,受配額限制)</option>
          <option value="npc">NPC(背景角色,不受配額限制)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          角色名稱
        </label>
        <input
          id="title"
          name="title"
          required
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
        {state && "fieldErrors" in state && state.fieldErrors.title && (
          <p className="text-sm text-danger">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium">
          slug(網址用)
        </label>
        <input
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9-]+"
          className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
        />
        {state && "fieldErrors" in state && state.fieldErrors.slug && (
          <p className="text-sm text-danger">{state.fieldErrors.slug[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="content" className="text-sm font-medium">
          角色正史 / 設定
        </label>
        <textarea
          id="content"
          name="content"
          rows={8}
          placeholder="可以用 [[名稱]] 建立 WikiLink"
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="categoryId" className="text-sm font-medium">
            分類(選填)
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue=""
            className="w-56 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <option value="">不掛分類</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {characterFields.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
          <p className="text-sm font-medium">
            這個世界觀要求角色都要填以下基本資料
          </p>
          {characterFields.map((f) => (
            <div key={f.id} className="flex flex-col gap-1">
              <label htmlFor={`field_${f.id}`} className="text-sm font-medium">
                {f.label}
              </label>
              <input
                id={`field_${f.id}`}
                name={`field_${f.id}`}
                required
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </div>
          ))}
        </div>
      )}

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "建立中…" : "建立角色"}
      </button>
    </form>
  );
}
