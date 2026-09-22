"use client";

import { useActionState, useMemo, useState } from "react";
import { importCharacterFromText } from "@/lib/actions/importCharacter";
import { parseCharacterImportText } from "@/lib/textImport";
import { CategorySelectOptions } from "@/components/CategorySelectOptions";

export function ImportCharacterForm({
  worldId,
  worldSlug,
  characterFields,
  sectionTemplates,
  categories,
}: {
  worldId: string;
  worldSlug: string;
  characterFields: { id: string; label: string; character_type: "pc" | "npc" | null }[];
  sectionTemplates: { id: string; label: string }[];
  categories: { id: string; name: string; accepts_submissions: boolean; parent_id: string | null }[];
}) {
  const [state, formAction, pending] = useActionState(
    importCharacterFromText,
    undefined,
  );
  const [rawText, setRawText] = useState("");
  const [characterType, setCharacterType] = useState<"pc" | "npc">("pc");

  // 共用欄位(character_type 是 NULL)兩邊都出現,'pc'/'npc' 只在對應類型出現。
  const visibleFields = useMemo(
    () =>
      characterFields.filter(
        (f) => f.character_type === null || f.character_type === characterType,
      ),
    [characterFields, characterType],
  );
  const fieldLabels = useMemo(() => visibleFields.map((f) => f.label), [visibleFields]);
  const sectionLabels = useMemo(() => sectionTemplates.map((t) => t.label), [sectionTemplates]);

  const preview = useMemo(
    () => parseCharacterImportText(rawText, fieldLabels, sectionLabels),
    [rawText, fieldLabels, sectionLabels],
  );
  const hasPreview = rawText.trim() !== "";

  return (
    <form action={formAction} className="mt-6 flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <p className="text-sm text-muted-foreground">
        貼上一大段角色設定文字,系統會用純規則(不經過任何 AI)自動拆解:
        獨立成行、且對到下面「角色必填欄位」名稱的「標籤：值」會填進對應欄位;
        獨立成行、且對到「補充區塊範本」標題的段落會切成獨立的補充區塊;
        `YYYY.MM` 或 `YYYY.MM.DD` 開頭的行會拉成生平時間線。都對不到的文字
        會落在主文裡。送出前可以先看右邊的預覽確認拆得對不對。
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="importCharacterType" className="text-sm font-medium">
          類型
        </label>
        <select
          id="importCharacterType"
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
        <label htmlFor="importTitle" className="text-sm font-medium">
          角色名稱
        </label>
        <input
          id="importTitle"
          name="title"
          required
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
        {state && "fieldErrors" in state && state.fieldErrors.title && (
          <p className="text-sm text-danger">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="importCategoryId" className="text-sm font-medium">
            分類(選填)
          </label>
          <select
            id="importCategoryId"
            name="categoryId"
            defaultValue=""
            className="w-56 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <option value="">不掛分類</option>
            <CategorySelectOptions categories={categories} />
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="rawText" className="text-sm font-medium">
            貼上角色設定文字
          </label>
          <textarea
            id="rawText"
            name="rawText"
            rows={16}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="把整份角色設定文字貼在這裡…"
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
          />
          {state && "fieldErrors" in state && state.fieldErrors.rawText && (
            <p className="text-sm text-danger">{state.fieldErrors.rawText[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 text-sm">
          <p className="font-medium">解析預覽</p>
          {!hasPreview && (
            <p className="text-muted-foreground">貼上文字後,這裡會即時顯示拆解結果。</p>
          )}
          {hasPreview && (
            <>
              <div>
                <p className="text-muted-foreground">
                  偵測到的角色欄位({preview.fieldValues.length})
                </p>
                {preview.fieldValues.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    無——{visibleFields.length === 0 ? "這個世界觀還沒設定角色必填欄位" : "沒有比對到標籤"}
                  </p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {preview.fieldValues.map((f, i) => (
                      <li key={i}>
                        <span className="text-muted-foreground">{f.label}：</span>
                        {f.value}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-muted-foreground">
                  偵測到的補充區塊({preview.sections.length})
                </p>
                {preview.sections.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    無——
                    {sectionTemplates.length === 0
                      ? "這個世界觀還沒設定補充區塊範本"
                      : "沒有獨立成行對到範本標題的段落"}
                  </p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {preview.sections.map((s, i) => (
                      <li key={i}>
                        {s.title}
                        <span className="text-xs text-muted-foreground">
                          ({s.content.length} 字)
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-muted-foreground">
                  偵測到的生平時間線({preview.timelineEvents.length})
                </p>
                {preview.timelineEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">無——沒有偵測到日期開頭的行</p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {preview.timelineEvents.map((t, i) => (
                      <li key={i}>
                        <span className="text-muted-foreground">{t.label}：</span>
                        {t.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-muted-foreground">
                  主文預覽({preview.mainContent.length} 字)
                </p>
                <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs">
                  {preview.mainContent || "(空)"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || rawText.trim() === ""}
        className="mt-2 w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "匯入中…" : "確認匯入"}
      </button>
    </form>
  );
}
