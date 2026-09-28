"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, createMessageAttachmentUploadTicket } from "@/lib/actions/messages";

const MESSAGE_ATTACHMENTS_BUCKET = "message-attachments";

type PendingAttachment = {
  key: string;
  fileName: string;
  path?: string;
  contentType: string;
  fileSize: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

export function MessageComposeForm({ recipientId }: { recipientId: string }) {
  const [state, formAction, pending] = useActionState(sendMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  // 送出成功後清掉附件清單——在 render 過程中比對 state 是否變成新的
  // 一次成功結果,不是在上面那個 useEffect 裡一起呼叫 setState(那樣會
  // 多一輪 render,見 react-hooks/set-state-in-effect)。
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state && "success" in state) {
      setAttachments([]);
    }
  }

  // 兩段式上傳(見 lib/actions/messages.ts createMessageAttachmentUploadTicket
  // 的說明):選好檔案就先上傳,不用等按「傳送」才一次處理——這時訊息還
  // 沒建立,票券的路徑只用「自己/對方/時間戳記」定位,不綁 message_id。
  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const key = `${file.name}-${Date.now()}-${Math.random()}`;
      setAttachments((prev) => [
        ...prev,
        {
          key,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          status: "uploading",
        },
      ]);

      const ticket = await createMessageAttachmentUploadTicket(
        recipientId,
        file.type,
        file.size,
      );
      if ("error" in ticket) {
        setAttachments((prev) =>
          prev.map((a) => (a.key === key ? { ...a, status: "error", error: ticket.error } : a)),
        );
        continue;
      }

      const { error: uploadError } = await supabase.storage
        .from(MESSAGE_ATTACHMENTS_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.key === key ? { ...a, status: "error", error: "上傳失敗,請稍後再試" } : a,
          ),
        );
        continue;
      }

      setAttachments((prev) =>
        prev.map((a) => (a.key === key ? { ...a, status: "done", path: ticket.path } : a)),
      );
    }
  }

  function removeAttachment(key: string) {
    setAttachments((prev) => prev.filter((a) => a.key !== key));
  }

  const stillUploading = attachments.some((a) => a.status === "uploading");
  const readyAttachments = attachments
    .filter((a): a is PendingAttachment & { path: string } => a.status === "done" && !!a.path)
    .map((a) => ({
      path: a.path,
      fileName: a.fileName,
      contentType: a.contentType,
      fileSize: a.fileSize,
    }));

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-4 flex flex-col gap-2"
    >
      <input type="hidden" name="recipientId" value={recipientId} />
      <input type="hidden" name="attachments" value={JSON.stringify(readyAttachments)} />
      <textarea
        name="content"
        rows={3}
        placeholder="輸入訊息…(也可以只傳附件,不打字)"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />

      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <li
              key={a.key}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1 text-xs"
            >
              <span className="max-w-40 truncate">{a.fileName}</span>
              {a.status === "uploading" && (
                <span className="text-muted-foreground">上傳中…</span>
              )}
              {a.status === "error" && <span className="text-danger">{a.error}</span>}
              <button
                type="button"
                onClick={() => removeAttachment(a.key)}
                className="text-muted-foreground hover:underline"
              >
                移除
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => {
            void handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
          className="text-sm"
        />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending || stillUploading}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "傳送中…" : stillUploading ? "附件上傳中…" : "傳送"}
      </button>
    </form>
  );
}
