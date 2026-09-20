"use client";

import { useActionState, useRef, useState } from "react";
import {
  createWorldRuleField,
  deleteWorldRuleField,
  moveWorldRuleField,
  updateWorldRuleField,
} from "@/lib/actions/worldRuleFields";
import { MarkdownText } from "@/components/MarkdownText";

export type RuleFieldItem = { id: string; label: string; content: string };

function FieldItem({
  field,
  index,
  total,
  worldId,
  worldSlug,
}: {
  field: RuleFieldItem;
  index: number;
  total: number;
  worldId: string;
  worldSlug: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateWorldRuleField, undefined);

  if (isEditing) {
    return (
      <form
        action={async (formData) => {
          await formAction(formData);
          setIsEditing(false);
        }}
        className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
      >
        <input type="hidden" name="fieldId" value={field.id} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <input
          name="label"
          defaultValue={field.label}
          required
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium"
        />
        <textarea
          name="content"
          defaultValue={field.content}
          required
          rows={4}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
        <p className="text-xs text-muted-foreground">支援簡易 markdown:段落、- 清單、**粗體**、*斜體*、[文字](網址) 連結。</p>
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
        <span className="font-medium">{field.label}</span>
        <div className="ml-auto flex gap-3 text-xs">
          <button type="button" onClick={() => setIsEditing(true)} className="underline">
            編輯
          </button>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => void moveWorldRuleField(field.id, worldId, worldSlug, "up")}
            className="underline disabled:opacity-30"
          >
            上移
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => void moveWorldRuleField(field.id, worldId, worldSlug, "down")}
            className="underline disabled:opacity-30"
          >
            下移
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`確定要刪除「${field.label}」這則規則嗎?`)) {
                void deleteWorldRuleField(field.id, worldSlug);
              }
            }}
            className="text-danger underline"
          >
            刪除
          </button>
        </div>
      </div>
      <div className="mt-2">
        <MarkdownText text={field.content} />
      </div>
    </div>
  );
}

export function WorldRuleFieldsEditor({
  worldId,
  worldSlug,
  fields,
}: {
  worldId: string;
  worldSlug: string;
  fields: RuleFieldItem[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createWorldRuleField,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2">
        {fields.map((field, i) => (
          <FieldItem
            key={field.id}
            field={field}
            index={i}
            total={fields.length}
            worldId={worldId}
            worldSlug={worldSlug}
          />
        ))}
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">還沒有設定任何世界觀規則。</p>
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
          <label htmlFor="new-field-label" className="text-sm font-medium">
            新增規則
          </label>
          <input
            id="new-field-label"
            name="label"
            placeholder="例如「投稿規範」"
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
        <p className="text-xs text-muted-foreground">支援簡易 markdown:段落、- 清單、**粗體**、*斜體*、[文字](網址) 連結。</p>
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
