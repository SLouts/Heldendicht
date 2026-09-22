"use client";

import { useActionState, useRef, useState } from "react";
import {
  createCategoryField,
  updateCategoryField,
  deleteCategoryField,
  moveCategoryField,
} from "@/lib/actions/categoryFields";

export type CategoryFieldItem = {
  id: string;
  label: string;
  default_value: string;
};

function CategoryFieldRow({
  item,
  index,
  total,
  categoryId,
  worldSlug,
}: {
  item: CategoryFieldItem;
  index: number;
  total: number;
  categoryId: string;
  worldSlug: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateCategoryField, undefined);

  if (isEditing) {
    return (
      <form
        action={async (formData) => {
          await formAction(formData);
          setIsEditing(false);
        }}
        className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
      >
        <input type="hidden" name="fieldId" value={item.id} />
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <input
          name="label"
          defaultValue={item.label}
          required
          placeholder="欄位名稱(區塊標題)"
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
        />
        <textarea
          name="defaultValue"
          defaultValue={item.default_value}
          rows={3}
          placeholder="預設內容(選填)"
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
        />
        <div className="flex gap-2">
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
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{item.label}</span>
        <div className="ml-auto flex gap-3 text-xs">
          <button type="button" onClick={() => setIsEditing(true)} className="underline">
            編輯
          </button>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => void moveCategoryField(item.id, categoryId, worldSlug, "up")}
            className="underline disabled:opacity-30"
          >
            上移
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => void moveCategoryField(item.id, categoryId, worldSlug, "down")}
            className="underline disabled:opacity-30"
          >
            下移
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`確定要刪除「${item.label}」這個預設欄位嗎?`)) {
                void deleteCategoryField(item.id, categoryId, worldSlug);
              }
            }}
            className="text-danger underline"
          >
            刪除
          </button>
        </div>
      </div>
      {item.default_value && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {item.default_value}
        </p>
      )}
    </div>
  );
}

export function CategoryFieldsEditor({
  worldId,
  worldSlug,
  categoryId,
  fields,
}: {
  worldId: string;
  worldSlug: string;
  categoryId: string;
  fields: CategoryFieldItem[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createCategoryField,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3">
        {fields.map((field, i) => (
          <CategoryFieldRow
            key={field.id}
            item={field}
            index={i}
            total={fields.length}
            categoryId={categoryId}
            worldSlug={worldSlug}
          />
        ))}
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">這個分類還沒有設定任何預設欄位。</p>
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
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <div className="flex flex-col gap-1">
          <label htmlFor="new-category-field-label" className="text-sm font-medium">
            新增欄位
          </label>
          <input
            id="new-category-field-label"
            name="label"
            placeholder="例如「宗門宗旨」"
            required
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
        <textarea
          name="defaultValue"
          rows={3}
          placeholder="預設內容(選填,建立節點時會先帶入這段文字)"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        />
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
