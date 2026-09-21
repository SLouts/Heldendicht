"use client";

import { useActionState, useRef, useState } from "react";

export type OrderedLabelItem = { id: string; label: string };

type LabelFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

/**
 * 世界觀角色必填欄位(world_character_fields)、補充區塊範本
 * (world_section_templates)這兩組「一個世界觀底下、只有 label 一個欄位、
 * 可以上移/下移/刪除」的清單,UI 結構完全一樣,原本各自複製一份檔案
 * (CharacterFieldsEditor.tsx / SectionTemplatesEditor.tsx),只有文字
 * 說明跟呼叫的 Server Action 不同——抽成這個共用元件,呼叫端只需要傳
 * 對應的 Server Action 跟顯示文字。
 *
 * idFieldName 是因為兩邊的 Server Action 讀 formData 用的欄位名稱不同
 * (fieldId / templateId),不強迫改成同一個名字以免動到既有的 action
 * 合約。
 */
export function OrderedLabelEditor({
  worldId,
  worldSlug,
  items,
  idFieldName,
  createAction,
  updateAction,
  onDelete,
  onMove,
  newSectionLabel,
  newPlaceholder,
  emptyText,
  deleteConfirmText,
}: {
  worldId: string;
  worldSlug: string;
  items: OrderedLabelItem[];
  idFieldName: string;
  createAction: (
    prevState: LabelFormState,
    formData: FormData,
  ) => Promise<LabelFormState>;
  updateAction: (
    prevState: LabelFormState,
    formData: FormData,
  ) => Promise<LabelFormState>;
  onDelete: (id: string, worldSlug: string) => Promise<void>;
  onMove: (
    id: string,
    worldId: string,
    worldSlug: string,
    direction: "up" | "down",
  ) => Promise<void>;
  newSectionLabel: string;
  newPlaceholder: string;
  emptyText: string;
  deleteConfirmText: (label: string) => string;
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
          <OrderedLabelItemRow
            key={item.id}
            item={item}
            index={i}
            total={items.length}
            worldId={worldId}
            worldSlug={worldSlug}
            idFieldName={idFieldName}
            updateAction={updateAction}
            onDelete={onDelete}
            onMove={onMove}
            deleteConfirmText={deleteConfirmText}
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
        className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="worldId" value={worldId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <div className="flex flex-col gap-1">
          <label htmlFor="new-ordered-label" className="text-sm font-medium">
            {newSectionLabel}
          </label>
          <input
            id="new-ordered-label"
            name="label"
            placeholder={newPlaceholder}
            required
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={createPending}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {createPending ? "新增中…" : "+ 新增"}
        </button>
        {createState && "error" in createState && (
          <p className="w-full text-sm text-danger">{createState.error}</p>
        )}
        {createState && "fieldErrors" in createState && (
          <p className="w-full text-sm text-danger">
            {Object.values(createState.fieldErrors).flat()[0]}
          </p>
        )}
      </form>
    </div>
  );
}

function OrderedLabelItemRow({
  item,
  index,
  total,
  worldId,
  worldSlug,
  idFieldName,
  updateAction,
  onDelete,
  onMove,
  deleteConfirmText,
}: {
  item: OrderedLabelItem;
  index: number;
  total: number;
  worldId: string;
  worldSlug: string;
  idFieldName: string;
  updateAction: (
    prevState: LabelFormState,
    formData: FormData,
  ) => Promise<LabelFormState>;
  onDelete: (id: string, worldSlug: string) => Promise<void>;
  onMove: (
    id: string,
    worldId: string,
    worldSlug: string,
    direction: "up" | "down",
  ) => Promise<void>;
  deleteConfirmText: (label: string) => string;
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
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2"
      >
        <input type="hidden" name={idFieldName} value={item.id} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <input
          name="label"
          defaultValue={item.label}
          required
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
        />
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
        {state && "error" in state && (
          <p className="w-full text-sm text-danger">{state.error}</p>
        )}
        {state && "fieldErrors" in state && (
          <p className="w-full text-sm text-danger">
            {Object.values(state.fieldErrors).flat()[0]}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-2">
      <span className="font-medium">{item.label}</span>
      <div className="ml-auto flex gap-3 text-xs">
        <button type="button" onClick={() => setIsEditing(true)} className="underline">
          編輯
        </button>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => void onMove(item.id, worldId, worldSlug, "up")}
          className="underline disabled:opacity-30"
        >
          上移
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => void onMove(item.id, worldId, worldSlug, "down")}
          className="underline disabled:opacity-30"
        >
          下移
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(deleteConfirmText(item.label))) {
              void onDelete(item.id, worldSlug);
            }
          }}
          className="text-danger underline"
        >
          刪除
        </button>
      </div>
    </div>
  );
}
