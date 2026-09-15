"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createNodeAttachmentUploadTicket,
  finalizeNodeAttachmentUpload,
  deleteNodeAttachment,
} from "@/lib/actions/attachments";

const NODE_ATTACHMENTS_BUCKET = "node-attachments";

export type AttachmentItem = {
  id: string;
  fileName: string;
  fileSize: number;
  kind: "image" | "file";
  url: string;
  uploaderLabel: string;
  createdAt: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsSection({
  nodeId,
  worldSlug,
  nodeSlug,
  canEdit,
  attachments,
}: {
  nodeId: string;
  worldSlug: string;
  nodeSlug: string;
  canEdit: boolean;
  attachments: AttachmentItem[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(id: string) {
    try {
      await navigator.clipboard.writeText(`{{image:${id}}}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      // clipboard API 在某些環境(例如非 https、權限被拒)可能會丟例外,安靜忽略即可。
    }
  }

  // 兩段式上傳(見 lib/actions/attachments.ts 的說明):先要簽名上傳票券,
  // 瀏覽器直接把檔案傳到 Supabase Storage,不經過我們自己的 server,不受
  // Vercel serverless function 的 request body 大小限制影響。
  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = e.currentTarget.elements.namedItem(
      "file",
    ) as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("請選擇一個檔案");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const ticket = await createNodeAttachmentUploadTicket(
        nodeId,
        file.type,
        file.size,
      );
      if ("error" in ticket) {
        setError(ticket.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(NODE_ATTACHMENTS_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type,
        });
      if (uploadError) {
        setError("上傳失敗,請稍後再試");
        return;
      }

      const result = await finalizeNodeAttachmentUpload(
        nodeId,
        worldSlug,
        nodeSlug,
        ticket.path,
        file.name,
        file.type,
        file.size,
      );
      if (result && "error" in result) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
    } catch {
      setError("上傳失敗,請稍後再試");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">附件</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        圖片可以用「複製嵌入語法」貼到上面的內文裡指定位置顯示;PDF 等文件只會列在這裡,不能嵌入內文。
      </p>

      {canEdit && (
        <form
          ref={formRef}
          onSubmit={handleUpload}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            required
            className="text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "上傳中…" : "上傳附件"}
          </button>
          {error && <span className="text-sm text-danger">{error}</span>}
        </form>
      )}

      {attachments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">目前還沒有附件。</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-2"
            >
              {a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
                <img
                  src={a.url}
                  alt={a.fileName}
                  className="h-16 w-16 rounded-md object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                  PDF
                </span>
              )}

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm">{a.fileName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(a.fileSize)} · {a.uploaderLabel} ·{" "}
                  {new Date(a.createdAt).toLocaleDateString("zh-TW")}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                {a.kind === "image" && (
                  <button
                    type="button"
                    onClick={() => handleCopy(a.id)}
                    className="underline"
                  >
                    {copiedId === a.id ? "已複製!" : "複製嵌入語法"}
                  </button>
                )}
                <a href={a.url} target="_blank" rel="noreferrer" className="underline">
                  {a.kind === "image" ? "開啟原圖" : "下載"}
                </a>
                {canEdit && (
                  <form action={deleteNodeAttachment.bind(null, a.id, worldSlug, nodeSlug)}>
                    <button type="submit" className="text-danger underline">
                      刪除
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
