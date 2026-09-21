"use client";

import { useActionState, useRef, useState } from "react";
import {
  createSectionTemplate,
  deleteSectionTemplate,
  moveSectionTemplate,
  updateSectionTemplate,
} from "@/lib/actions/sectionTemplates";

export type SectionTemplateItem = { id: string; label: string };

function TemplateItem({
  template,
  index,
  total,
  worldId,
  worldSlug,
}: {
  template: SectionTemplateItem;
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
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2"
      >
        <input type="hidden" name="templateId" value={template.id} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <input
          name="label"
          defaultValue={template.label}
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
      <span className="font-medium">{template.label}</span>
      <div className="ml-auto flex gap-3 text-xs">
        <button type="button" onClick={() => setIsEditing(true)} className="underline">
          編輯
        </button>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => void moveSectionTemplate(template.id, worldId, worldSlug, "up")}
          className="underline disabled:opacity-30"
        >
          上移
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => void moveSectionTemplate(template.id, worldId, worldSlug, "down")}
          className="underline disabled:opacity-30"
        >
          下移
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`確定要刪除「${template.label}」這個區塊範本嗎?已經建立的補充區塊不會被刪除。`)) {
              void deleteSectionTemplate(template.id, worldSlug);
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

export function SectionTemplatesEditor({
  worldId,
  worldSlug,
  templates,
}: {
  worldId: string;
  worldSlug: string;
  templates: SectionTemplateItem[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createSectionTemplate,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2">
        {templates.map((template, i) => (
          <TemplateItem
            key={template.id}
            template={template}
            index={i}
            total={templates.length}
            worldId={worldId}
            worldSlug={worldSlug}
          />
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground">還沒有設定任何區塊範本。</p>
        )}
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await createAction(formData);
          formRef.current?.reset();
        }}
        className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="worldId" value={worldId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <div className="flex flex-col gap-1">
          <label htmlFor="new-template-label" className="text-sm font-medium">
            新增區塊範本
          </label>
          <input
            id="new-template-label"
            name="label"
            placeholder="例如「技能」"
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
