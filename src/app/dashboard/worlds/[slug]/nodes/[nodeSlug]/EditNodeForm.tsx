"use client";

import { useActionState } from "react";
import { updateNodeContent } from "@/lib/actions/nodes";

export function EditNodeForm({
  nodeId,
  worldSlug,
  nodeSlug,
  title,
  content,
  isPlaceholder,
  nodeType,
  categories,
  currentCategoryId,
}: {
  nodeId: string;
  worldSlug: string;
  nodeSlug: string;
  title: string;
  content: string;
  isPlaceholder: boolean;
  nodeType: string;
  categories: { id: string; name: string; accepts_submissions: boolean }[];
  currentCategoryId: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateNodeContent,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="nodeId" value={nodeId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />
      <input type="hidden" name="nodeSlug" value={nodeSlug} />

      {isPlaceholder && (
        <div className="rounded-lg border border-badge-pending-fg/30 bg-badge-pending-bg p-3 text-sm">
          <p className="text-badge-pending-fg">
            這是 WikiLink 自動建立的待撰寫節點,請補上正確類型跟內容。
          </p>
          <div className="mt-2 flex flex-col gap-1">
            <label htmlFor="nodeType" className="text-sm font-medium">
              類型
            </label>
            <select
              id="nodeType"
              name="nodeType"
              defaultValue={nodeType === "unspecified" ? "" : nodeType}
              required
              className="w-40 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <option value="" disabled>
                選擇類型
              </option>
              <option value="location">地點</option>
              <option value="item">物產</option>
              <option value="faction">勢力</option>
              <option value="concept">概念</option>
              <option value="event">事件</option>
              <option value="article">文章</option>
            </select>
            <p className="mt-1 text-xs text-badge-pending-fg/80">
              如果這個名稱其實該是角色,請改用「新增角色」重新建立,再手動把這個待撰寫節點刪掉。
            </p>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="categoryId" className="text-sm font-medium">
            內容分類(選填)
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={currentCategoryId ?? ""}
            className="w-56 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <option value="">不掛分類</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          標題
        </label>
        <input
          id="title"
          name="title"
          defaultValue={title}
          required
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="content" className="text-sm font-medium">
          內文
        </label>
        <textarea
          id="content"
          name="content"
          rows={10}
          defaultValue={content}
          placeholder="可以用 [[名稱]] 建立 WikiLink,用 {{image:附件id}} 嵌入下方附件裡的圖片"
          className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
        />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "儲存中…" : "儲存"}
      </button>
    </form>
  );
}
