"use client";

import { useActionState, useRef, useState } from "react";
import {
  createSectionTemplate,
  updateSectionTemplate,
  deleteSectionTemplate,
  moveSectionTemplate,
} from "@/lib/actions/sectionTemplates";

export type SectionTemplateItem = {
  id: string;
  label: string;
  example_content: string;
};

/**
 * 補充章節範本(world_section_templates)的編輯清單——跟必填欄位
 * (CharacterFieldsSection)結構很像,但範例是多行文字(textarea),不是
 * 單行 input,兩邊資料形狀不同,不硬塞進同一個共用元件。
 */
export function SectionTemplatesSection({
  worldId,
  worldSlug,
  items,
}: {
  worldId: string;
  worldSlug: string;
  items: SectionTemplateItem[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createSectionTemplate,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <SectionTemplateRow
            key={item.id}
            item={item}
            index={i}
            total={items.length}
            worldId={worldId}
            worldSlug={worldSlug}
          />
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">還沒有設定任何補充章節。</p>
        )}
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await createAction(formData);
          formRef.current?.reset();
        }}
        className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="worldId" value={worldId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <div className="flex flex-col gap-1">
          <label htmlFor="new-section-label" className="text-sm font-medium">
            新增章節
          </label>
          <input
            id="new-section-label"
            name="label"
            placeholder="例如「外表描述」"
            required
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="new-section-example" className="text-sm font-medium">
            範例內容(選填)
          </label>
          <textarea
            id="new-section-example"
            name="exampleContent"
            rows={3}
            placeholder="示範這個章節可以怎麼寫"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={createPending}
          className="w-fit rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {createPending ? "新增中…" : "+ 新增"}
        </button>
        {createState && "error" in createState && (
          <p className="text-sm text-danger">{createState.error}</p>
        )}
        {createState && "fieldErrors" in createState && (
          <p className="text-sm text-danger">
            {Object.values(createState.fieldErrors).flat()[0]}
          </p>
        )}
      </form>
    </div>
  );
}

function SectionTemplateRow({
  item,
  index,
  total,
  worldId,
  worldSlug,
}: {
  item: SectionTemplateItem;
  index: number;
  total: number;
  worldId: string;
  worldSlug: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateSectionTemplate,
    undefined,
  );

  if (isEditing) {
    return (
      <form
        action={async (formData) => {
          await formAction(formData);
          setIsEditing(false);
        }}
        className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
      >
        <input type="hidden" name="templateId" value={item.id} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <input
          name="label"
          defaultValue={item.label}
          required
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium"
        />
        <textarea
          name="exampleContent"
          defaultValue={item.example_content}
          rows={3}
          placeholder="範例內容(選填)"
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "儲存中…" : "儲存"}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-sm text-muted-foreground underline"
          >
            取消
          </button>
        </div>
        {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}
        {state && "fieldErrors" in state && (
          <p className="text-sm text-danger">{Object.values(state.fieldErrors).flat()[0]}</p>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{item.label}</span>
        <div className="ml-auto flex gap-3 text-xs">
          <button type="button" onClick={() => setIsEditing(true)} className="underline">
            編輯
          </button>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => void moveSectionTemplate(item.id, worldId, worldSlug, "up")}
            className="underline disabled:opacity-30"
          >
            上移
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => void moveSectionTemplate(item.id, worldId, worldSlug, "down")}
            className="underline disabled:opacity-30"
          >
            下移
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  `確定要刪除「${item.label}」這個補充章節嗎?已經建立的補充區塊不會被刪除。`,
                )
              ) {
                void deleteSectionTemplate(item.id, worldSlug);
              }
            }}
            className="text-danger underline"
          >
            刪除
          </button>
        </div>
      </div>
      {item.example_content && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {item.example_content}
        </p>
      )}
    </div>
  );
}
