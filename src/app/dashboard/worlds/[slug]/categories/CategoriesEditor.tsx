"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  createContentCategory,
  updateContentCategory,
  deleteContentCategory,
  moveContentCategory,
} from "@/lib/actions/contentCategories";

export type ContentCategoryItem = {
  id: string;
  name: string;
  description: string | null;
  accepts_submissions: boolean;
  parent_id: string | null;
};

function CategoryItem({
  category,
  index,
  total,
  worldId,
  worldSlug,
  parentOptions,
}: {
  category: ContentCategoryItem;
  index: number;
  total: number;
  worldId: string;
  worldSlug: string;
  /** 可以選的大分類——只有頂層分類能當大分類,且不能選自己。 */
  parentOptions: { id: string; name: string }[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateContentCategory, undefined);

  if (isEditing) {
    return (
      <form
        action={async (formData) => {
          await formAction(formData);
          setIsEditing(false);
        }}
        className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
      >
        <input type="hidden" name="categoryId" value={category.id} />
        <input type="hidden" name="worldId" value={worldId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <input
          name="name"
          defaultValue={category.name}
          required
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
          placeholder="分類名稱"
        />
        <textarea
          name="description"
          defaultValue={category.description ?? ""}
          rows={2}
          placeholder="簡介(選填)"
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
        />
        {parentOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">大分類</label>
            <select
              name="parentId"
              defaultValue={category.parent_id ?? ""}
              className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="">不歸類任何大分類</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="acceptsSubmissions"
            defaultChecked={category.accepts_submissions}
          />
          開放一般玩家投稿
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
        <span className="font-medium">{category.name}</span>
        <span
          className={
            category.accepts_submissions
              ? "rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg"
              : "rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg"
          }
        >
          {category.accepts_submissions ? "開放投稿" : "未開放"}
        </span>
        <div className="ml-auto flex gap-3 text-xs">
          <button type="button" onClick={() => setIsEditing(true)} className="underline">
            編輯
          </button>
          <Link
            href={`/dashboard/worlds/${worldSlug}/categories/${category.id}/fields`}
            className="underline"
          >
            預設欄位
          </Link>
          <button
            type="button"
            disabled={index === 0}
            onClick={() =>
              void moveContentCategory(category.id, worldId, worldSlug, category.parent_id, "up")
            }
            className="underline disabled:opacity-30"
          >
            上移
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() =>
              void moveContentCategory(
                category.id,
                worldId,
                worldSlug,
                category.parent_id,
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
              if (
                confirm(
                  `確定要刪除「${category.name}」這個分類嗎?底下的節點不會被刪除,只是會變回未分類;如果這是別的分類的大分類,子分類也不會被刪除,只是變回沒有大分類;這個分類設定的預設欄位會一併刪除。`,
                )
              ) {
                void deleteContentCategory(category.id, worldId, worldSlug);
              }
            }}
            className="text-danger underline"
          >
            刪除
          </button>
        </div>
      </div>
      {category.description && (
        <p className="text-sm text-muted-foreground">{category.description}</p>
      )}
    </div>
  );
}

export function CategoriesEditor({
  worldId,
  worldSlug,
  categories,
}: {
  worldId: string;
  worldSlug: string;
  categories: ContentCategoryItem[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createContentCategory,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // 分類固定兩層:頂層(可能是獨立分類,也可能是別人的大分類)+ 底下的
  // 子分類。依 parent_id 分組,頂層跟每個大分類底下的子分類各自是一組
  // 獨立的排序清單(上移/下移只在同一組裡互換)。
  const topLevel = categories.filter((c) => c.parent_id === null);
  const childrenByParent = new Map<string, ContentCategoryItem[]>();
  for (const c of categories) {
    if (c.parent_id) {
      const list = childrenByParent.get(c.parent_id) ?? [];
      list.push(c);
      childrenByParent.set(c.parent_id, list);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3">
        {topLevel.map((category, i) => {
          const children = childrenByParent.get(category.id) ?? [];
          return (
            <div key={category.id} className="flex flex-col gap-3">
              <CategoryItem
                category={category}
                index={i}
                total={topLevel.length}
                worldId={worldId}
                worldSlug={worldSlug}
                parentOptions={topLevel.filter((p) => p.id !== category.id)}
              />
              {children.length > 0 && (
                <div className="ml-6 flex flex-col gap-3 border-l border-border pl-4">
                  {children.map((child, i) => (
                    <CategoryItem
                      key={child.id}
                      category={child}
                      index={i}
                      total={children.length}
                      worldId={worldId}
                      worldSlug={worldSlug}
                      parentOptions={topLevel.filter((p) => p.id !== child.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">還沒有設定任何分類。</p>
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
          <label htmlFor="new-category-name" className="text-sm font-medium">
            新增分類
          </label>
          <input
            id="new-category-name"
            name="name"
            placeholder="例如「修仙誌‧宗門」"
            required
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
        <textarea
          name="description"
          rows={2}
          placeholder="簡介(選填)"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        />
        {topLevel.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="new-category-parent" className="text-sm font-medium">
              大分類(選填)
            </label>
            <select
              id="new-category-parent"
              name="parentId"
              defaultValue=""
              className="w-56 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            >
              <option value="">不歸類任何大分類</option>
              {topLevel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="acceptsSubmissions" defaultChecked />
          開放一般玩家投稿
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
