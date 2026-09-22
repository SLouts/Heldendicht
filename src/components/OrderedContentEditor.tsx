"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { MarkdownText } from "./MarkdownText";

export type OrderedContentItem = { id: string; label: string; content: string };

type ContentFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

/**
 * 全站規則(site_rule_fields)、世界觀規則(world_rule_fields)這兩組
 * 「標題+說明內容,可以上移/下移/刪除」的清單,UI 結構完全一樣,原本
 * 各自複製一份檔案(SiteRuleFieldsEditor.tsx / WorldRuleFieldsEditor.tsx),
 * 只有要不要多帶 worldId/worldSlug、呼叫的 Server Action 不同——抽成
 * 這個共用元件。
 *
 * 全站規則沒有世界觀範圍,onMove/onDelete 的參數量也跟世界觀規則不一樣
 * (少了 worldId/worldSlug),所以這裡不直接傳 Server Action 本身,而是
 * 由呼叫端各自包成統一的 (id, direction) => void / (id) => void,呼叫端
 * 的差異留在呼叫端處理,不逼共用元件遷就兩種不同的參數量。extraHiddenFields
 * 同理——世界觀規則的表單要多帶 worldId/worldSlug 兩個隱藏欄位,全站
 * 規則不用,由呼叫端決定要不要傳。
 */
export function OrderedContentEditor({
  items,
  extraHiddenFields,
  createAction,
  updateAction,
  onDelete,
  onMove,
  newLabel,
  newLabelPlaceholder,
  emptyText,
}: {
  items: OrderedContentItem[];
  extraHiddenFields?: ReactNode;
  createAction: (
    prevState: ContentFormState,
    formData: FormData,
  ) => Promise<ContentFormState>;
  updateAction: (
    prevState: ContentFormState,
    formData: FormData,
  ) => Promise<ContentFormState>;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  newLabel: string;
  newLabelPlaceholder: string;
  emptyText: string;
}) {
  const [createState, createAction_, createPending] = useActionState(
    createAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <OrderedContentItemRow
            key={item.id}
            item={item}
            index={i}
            total={items.length}
            extraHiddenFields={extraHiddenFields}
            updateAction={updateAction}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await createAction_(formData);
          formRef.current?.reset();
        }}
        className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3"
      >
        {extraHiddenFields}
        <div className="flex flex-col gap-1">
          <label htmlFor="new-field-label" className="text-sm font-medium">
            {newLabel}
          </label>
          <input
            id="new-field-label"
            name="label"
            placeholder={newLabelPlaceholder}
            required
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
        <textarea
          name="content"
          placeholder="規則的說明內容"
          required
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          支援簡易 markdown:段落、- 清單、**粗體**、*斜體*、[文字](網址) 連結。
        </p>
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

function OrderedContentItemRow({
  item,
  index,
  total,
  extraHiddenFields,
  updateAction,
  onDelete,
  onMove,
}: {
  item: OrderedContentItem;
  index: number;
  total: number;
  extraHiddenFields?: ReactNode;
  updateAction: (
    prevState: ContentFormState,
    formData: FormData,
  ) => Promise<ContentFormState>;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateAction, undefined);

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
        {extraHiddenFields}
        <input
          name="label"
          defaultValue={item.label}
          required
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium"
        />
        <textarea
          name="content"
          defaultValue={item.content}
          required
          rows={4}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          支援簡易 markdown:段落、- 清單、**粗體**、*斜體*、[文字](網址) 連結。
        </p>
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
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{item.label}</span>
        <div className="ml-auto flex gap-3 text-xs">
          <button type="button" onClick={() => setIsEditing(true)} className="underline">
            編輯
          </button>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(item.id, "up")}
            className="underline disabled:opacity-30"
          >
            上移
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(item.id, "down")}
            className="underline disabled:opacity-30"
          >
            下移
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`確定要刪除「${item.label}」這則規則嗎?`)) {
                onDelete(item.id);
              }
            }}
            className="text-danger underline"
          >
            刪除
          </button>
        </div>
      </div>
      <div className="mt-2">
        <MarkdownText text={item.content} />
      </div>
    </div>
  );
}
