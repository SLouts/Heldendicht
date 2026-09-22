"use client";

import { useActionState, useState } from "react";
import { updateNodeContent } from "@/lib/actions/nodes";
import { createClient } from "@/lib/supabase/client";
import {
  createNodeAttachmentUploadTicket,
  finalizeNodeAttachmentUpload,
} from "@/lib/actions/attachments";
import { insertTextAtCursor } from "@/lib/insertAtCursor";
import { CategorySelectOptions } from "@/components/CategorySelectOptions";

const NODE_ATTACHMENTS_BUCKET = "node-attachments";

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
  isStaff,
}: {
  nodeId: string;
  worldSlug: string;
  nodeSlug: string;
  title: string;
  content: string;
  isPlaceholder: boolean;
  nodeType: string;
  categories: { id: string; name: string; accepts_submissions: boolean; parent_id: string | null }[];
  currentCategoryId: string | null;
  isStaff: boolean;
}) {
  // 一般節點(不含角色)一定要選一個分類才能保留/建立(見
  // guard_node_category trigger),不能改回「不掛分類」——角色節點的分類
  // 本來就是選填的裝飾用途,不受這條限制。
  const categoryRequired = !isStaff && nodeType !== "character";
  const [state, formAction, pending] = useActionState(
    updateNodeContent,
    undefined,
  );
  const [pasteUploading, setPasteUploading] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  /**
   * 讓貼圖片到內文欄位就像貼到一般電子郵件一樣直接嵌入,不用先手動上傳
   * 附件、再另外複製語法貼回來。貼上的是圖片時攔截預設貼上行為,改成
   * 上傳成附件後把 {{image:id}} 插到游標位置(用當初上傳附件同一套
   * 兩段式簽名上傳流程,detail 見 lib/actions/attachments.ts)。
   */
  async function handleContentPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/"),
    );
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;

    e.preventDefault();
    setPasteError(null);
    setPasteUploading(true);
    const textarea = e.currentTarget;
    try {
      const ticket = await createNodeAttachmentUploadTicket(
        nodeId,
        file.type,
        file.size,
      );
      if ("error" in ticket) {
        setPasteError(ticket.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(NODE_ATTACHMENTS_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type,
        });
      if (uploadError) {
        setPasteError("上傳失敗,請稍後再試");
        return;
      }

      const result = await finalizeNodeAttachmentUpload(
        nodeId,
        worldSlug,
        nodeSlug,
        ticket.path,
        file.name || "貼上的圖片",
        file.type,
        file.size,
        false,
      );
      if ("error" in result) {
        setPasteError(result.error);
        return;
      }

      insertTextAtCursor(textarea, `{{image:${result.id}}}`);
    } catch {
      setPasteError("上傳失敗,請稍後再試");
    } finally {
      setPasteUploading(false);
    }
  }

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
            內容分類{categoryRequired ? "" : "(選填)"}
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required={categoryRequired}
            defaultValue={currentCategoryId ?? ""}
            className="w-56 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <option value="" disabled={categoryRequired}>
              {categoryRequired ? "請選擇分類" : "不掛分類"}
            </option>
            <CategorySelectOptions categories={categories} />
          </select>
          {categoryRequired && (
            <p className="text-xs text-muted-foreground">
              一般節點一定要選一個開放投稿的分類,不能改回不掛分類。
            </p>
          )}
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
          onPaste={handleContentPaste}
          placeholder="可以用 [[名稱]] 建立 WikiLink;直接貼上圖片(像貼到一般電子郵件一樣)就會自動上傳並嵌入"
          className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
        />
        {pasteUploading && (
          <p className="text-xs text-muted-foreground">圖片上傳中…</p>
        )}
        {pasteError && <p className="text-xs text-danger">{pasteError}</p>}
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
