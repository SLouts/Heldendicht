import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AttachmentKind } from "@/lib/supabase/database.types";

export const MESSAGE_ATTACHMENTS_BUCKET = "message-attachments";
export const MESSAGE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const MESSAGE_ATTACHMENT_ALLOWED_TYPES: Record<
  string,
  { ext: string; kind: AttachmentKind }
> = {
  "image/png": { ext: "png", kind: "image" },
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "application/pdf": { ext: "pdf", kind: "file" },
};

/**
 * message-attachments bucket 是 private 的,沒有任何 anon/authenticated
 * 的 storage RLS policy。呼叫這裡之前,呼叫端應該已經透過一般 RLS-gated
 * client 讀過 direct_message_attachments 這張表(select policy 會先把
 * 不是這則訊息寄件者/收件者的請求濾掉),所以這裡只負責簽短效期(10 分鐘)
 * 的 signed URL,不重複判斷權限。
 */
export async function getMessageAttachmentSignedUrl(
  path: string,
  download?: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(MESSAGE_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 600, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}
