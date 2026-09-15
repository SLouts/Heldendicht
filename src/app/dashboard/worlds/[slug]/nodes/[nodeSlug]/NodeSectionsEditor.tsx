"use client";

import { useActionState, useRef, useState } from "react";
import {
  createNodeSection,
  deleteNodeSection,
  moveNodeSection,
  updateNodeSection,
} from "@/lib/actions/nodeSections";

export type NodeSectionItem = {
  id: string;
  title: string;
  content: string;
};

function SectionItem({
  section,
  index,
  total,
  nodeId,
  worldSlug,
  nodeSlug,
  canEdit,
}: {
  section: NodeSectionItem;
  index: number;
  total: number;
  nodeId: string;
  worldSlug: string;
  nodeSlug: string;
  canEdit: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateNodeSection,
    undefined,
  );

  if (isEditing) {
    return (
      <div className="rounded-lg border border-border bg-surface p-3">
        <form
          action={async (formData) => {
            await formAction(formData);
            setIsEditing(false);
          }}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="sectionId" value={section.id} />
          <input type="hidden" name="worldSlug" value={worldSlug} />
          <input type="hidden" name="nodeSlug" value={nodeSlug} />
          <input
            name="title"
            defaultValue={section.title}
            required
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium"
          />
          <textarea
            name="content"
            defaultValue={section.content}
            rows={6}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          {state && "error" in state && (
            <p className="text-sm text-danger">{state.error}</p>
          )}
          {state && "fieldErrors" in state && (
            <p className="text-sm text-danger">
              {Object.values(state.fieldErrors).flat()[0]}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="w-fit rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
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
        </form>
      </div>
    );
  }

  return (
    <details className="rounded-lg border border-border bg-surface p-3">
      <summary className="cursor-pointer font-medium">
        {section.title}
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-sm">{section.content}</p>
      {canEdit && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-2 text-xs">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="underline"
          >
            編輯
          </button>
          <button
            type="button"
            disabled={index === 0}
            onClick={() =>
              void moveNodeSection(section.id, nodeId, worldSlug, nodeSlug, "up")
            }
            className="underline disabled:opacity-30"
          >
            上移
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() =>
              void moveNodeSection(
                section.id,
                nodeId,
                worldSlug,
                nodeSlug,
                "down",
              )
            }
            className="underline disabled:opacity-30"
          >
            下移
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`確定要刪除「${section.title}」這個區塊嗎?`)) {
                void deleteNodeSection(section.id, worldSlug, nodeSlug);
              }
            }}
            className="text-danger underline"
          >
            刪除
          </button>
        </div>
      )}
    </details>
  );
}

export function NodeSectionsEditor({
  nodeId,
  worldSlug,
  nodeSlug,
  canEdit,
  sections,
}: {
  nodeId: string;
  worldSlug: string;
  nodeSlug: string;
  canEdit: boolean;
  sections: NodeSectionItem[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createNodeSection,
    undefined,
  );
  const createFormRef = useRef<HTMLFormElement>(null);

  if (sections.length === 0 && !canEdit) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">補充區塊</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        像外表、技能、個人主線、時間線這類可以獨立收合的補充內容,跟上面的主要內文分開管理。
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {sections.map((section, i) => (
          <SectionItem
            key={section.id}
            section={section}
            index={i}
            total={sections.length}
            nodeId={nodeId}
            worldSlug={worldSlug}
            nodeSlug={nodeSlug}
            canEdit={canEdit}
          />
        ))}
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground">還沒有任何補充區塊。</p>
        )}
      </div>

      {canEdit && (
        <form
          ref={createFormRef}
          action={async (formData) => {
            await createAction(formData);
            createFormRef.current?.reset();
          }}
          className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3"
        >
          <input type="hidden" name="nodeId" value={nodeId} />
          <input type="hidden" name="worldSlug" value={worldSlug} />
          <input type="hidden" name="nodeSlug" value={nodeSlug} />
          <input
            name="title"
            placeholder="區塊標題,例如「外表」"
            required
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <textarea
            name="content"
            placeholder="區塊內容"
            rows={4}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          {createState && "error" in createState && (
            <p className="text-sm text-danger">{createState.error}</p>
          )}
          {createState && "fieldErrors" in createState && (
            <p className="text-sm text-danger">
              {Object.values(createState.fieldErrors).flat()[0]}
            </p>
          )}
          <button
            type="submit"
            disabled={createPending}
            className="w-fit rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            {createPending ? "新增中…" : "+ 新增區塊"}
          </button>
        </form>
      )}
    </section>
  );
}
