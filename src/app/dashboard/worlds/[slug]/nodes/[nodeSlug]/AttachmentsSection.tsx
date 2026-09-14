"use client";

import { useActionState, useState } from "react";
import { uploadNodeAttachment, deleteNodeAttachment } from "@/lib/actions/attachments";

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
  const [state, formAction, pending] = useActionState(
    uploadNodeAttachment,
    undefined,
  );
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

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">附件</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        圖片可以用「複製嵌入語法」貼到上面的內文裡指定位置顯示;PDF 等文件只會列在這裡,不能嵌入內文。
      </p>

      {canEdit && (
        <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="nodeId" value={nodeId} />
          <input type="hidden" name="worldSlug" value={worldSlug} />
          <input type="hidden" name="nodeSlug" value={nodeSlug} />
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
          {state && "error" in state && (
            <span className="text-sm text-danger">{state.error}</span>
          )}
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
