"use client";

import { useActionState, useRef, useState } from "react";
import {
  createCategoryField,
  updateCategoryField,
  deleteCategoryField,
  moveCategoryField,
  copyCategoryFields,
} from "@/lib/actions/categoryFields";
import { FieldTypeConfigFields } from "@/components/FieldTypeConfigFields";

export type CategoryFieldItem = {
  id: string;
  label: string;
  example_value: string;
  is_required: boolean;
  field_type: "text" | "select" | "range";
  options: string[];
  range_min: number | null;
  range_max: number | null;
  range_step: number | null;
};

const FIELD_TYPE_BADGE: Record<"text" | "select" | "range", string> = {
  text: "簡答",
  select: "下拉選單",
  range: "橫條拉桿",
};

export type CopySourceCategory = { id: string; name: string; fieldCount: number };

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
          placeholder="欄位名稱"
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
        />
        <textarea
          name="exampleValue"
          defaultValue={item.example_value}
          rows={3}
          placeholder="範例值(選填,示範這個欄位該怎麼填給玩家參考)"
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
        />
        <FieldTypeConfigFields
          idPrefix={`category-field-${item.id}`}
          defaultFieldType={item.field_type}
          defaultOptions={item.options}
          defaultRangeMin={item.range_min}
          defaultRangeMax={item.range_max}
          defaultRangeStep={item.range_step}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isRequired"
            defaultChecked={item.is_required}
            className="rounded border-border"
          />
          必填(留空不能送出;橫條拉桿一定有值,勾選這個不會有效果)
        </label>
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
        {item.is_required ? (
          <span className="rounded-full bg-badge-danger-bg px-2 py-0.5 text-xs text-badge-danger-fg">
            必填
          </span>
        ) : (
          <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
            選填
          </span>
        )}
        <span className="rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg">
          {FIELD_TYPE_BADGE[item.field_type]}
        </span>
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
              if (confirm(`確定要刪除「${item.label}」這個欄位嗎?`)) {
                void deleteCategoryField(item.id, categoryId, worldSlug);
              }
            }}
            className="text-danger underline"
          >
            刪除
          </button>
        </div>
      </div>
      {item.field_type === "select" && (
        <p className="text-sm text-muted-foreground">選項:{item.options.join("、")}</p>
      )}
      {item.field_type === "range" && (
        <p className="text-sm text-muted-foreground">
          範圍:{item.range_min} ~ {item.range_max}(間距 {item.range_step})
        </p>
      )}
      {item.example_value && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          範例:{item.example_value}
        </p>
      )}
    </div>
  );
}

function CopyFieldsForm({
  worldId,
  worldSlug,
  categoryId,
  copySources,
}: {
  worldId: string;
  worldSlug: string;
  categoryId: string;
  copySources: CopySourceCategory[];
}) {
  const [sourceId, setSourceId] = useState(copySources[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (copySources.length === 0) return null;

  async function handleCopy() {
    if (!sourceId) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await copyCategoryFields(sourceId, categoryId, worldId, worldSlug);
      if ("error" in result) {
        setIsError(true);
        setMessage(result.error);
      } else {
        setIsError(false);
        setMessage(`已複製 ${result.copiedCount} 個欄位,可以在上面繼續編輯。`);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-sm font-medium">複製已有格式</p>
      <p className="text-xs text-muted-foreground">
        把另一個分類已經設定好的欄位複製過來當起點,再繼續編輯——同名的欄位會略過,不會重複。
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        >
          {copySources.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}({c.fieldCount} 個欄位)
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={pending}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-50"
        >
          {pending ? "複製中…" : "複製過來"}
        </button>
      </div>
      {message && (
        <p className={`text-sm ${isError ? "text-danger" : "text-muted-foreground"}`}>{message}</p>
      )}
    </div>
  );
}

export function CategoryFieldsEditor({
  worldId,
  worldSlug,
  categoryId,
  fields,
  copySources,
}: {
  worldId: string;
  worldSlug: string;
  categoryId: string;
  fields: CategoryFieldItem[];
  copySources: CopySourceCategory[];
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
          <p className="text-sm text-muted-foreground">這個分類還沒有設定任何欄位。</p>
        )}
      </div>

      <CopyFieldsForm
        worldId={worldId}
        worldSlug={worldSlug}
        categoryId={categoryId}
        copySources={copySources}
      />

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
          name="exampleValue"
          rows={3}
          placeholder="範例值(選填,示範這個欄位該怎麼填給玩家參考)"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        />
        <FieldTypeConfigFields idPrefix="new-category-field" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isRequired" className="rounded border-border" />
          必填(留空不能送出;橫條拉桿一定有值,勾選這個不會有效果)
        </label>
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
