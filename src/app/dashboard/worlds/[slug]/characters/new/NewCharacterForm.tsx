"use client";

import { useActionState, useState } from "react";
import { createCharacter } from "@/lib/actions/characters";
import { CategorySelectOptions } from "@/components/CategorySelectOptions";

export function NewCharacterForm({
  worldId,
  worldSlug,
  characterFields,
  categories,
  fieldLabelsByCategory,
}: {
  worldId: string;
  worldSlug: string;
  characterFields: { id: string; label: string; character_type: "pc" | "npc" | null }[];
  categories: { id: string; name: string; accepts_submissions: boolean; parent_id: string | null }[];
  fieldLabelsByCategory: Record<string, string[]>;
}) {
  const [state, formAction, pending] = useActionState(
    createCharacter,
    undefined,
  );
  const [characterType, setCharacterType] = useState<"pc" | "npc">("pc");
  const [categoryId, setCategoryId] = useState("");
  const previewFields = fieldLabelsByCategory[categoryId] ?? [];

  // 共用欄位(character_type 是 NULL)兩邊都出現,'pc'/'npc' 只在對應類型出現。
  const visibleFields = characterFields.filter(
    (f) => f.character_type === null || f.character_type === characterType,
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
          value={characterType}
          onChange={(e) => setCharacterType(e.target.value as "pc" | "npc")}
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
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-56 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <option value="">不掛分類</option>
            <CategorySelectOptions categories={categories} />
          </select>
          {previewFields.length > 0 && (
            <p className="text-xs text-muted-foreground">
              建立後會自動帶入預設區塊:{previewFields.join("、")}(可自由編輯或刪除)
            </p>
          )}
        </div>
      )}

      {visibleFields.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
          <p className="text-sm font-medium">
            這個世界觀要求角色都要填以下基本資料
          </p>
          {visibleFields.map((f) => (
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
