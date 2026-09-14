import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AttachmentKind } from "@/lib/supabase/database.types";

export const NODE_ATTACHMENTS_BUCKET = "node-attachments";
export const NODE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const NODE_ATTACHMENT_ALLOWED_TYPES: Record<
  string,
  { ext: string; kind: AttachmentKind }
> = {
  "image/png": { ext: "png", kind: "image" },
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "application/pdf": { ext: "pdf", kind: "file" },
};

/**
 * node-attachments bucket 是 private 的,沒有任何 anon/authenticated 的
 * storage RLS policy。呼叫這裡之前,呼叫端應該已經透過一般 RLS-gated
 * client 讀過 node_attachments 這張表(SELECT policy 會先把不可見的
 * 附件濾掉),所以這裡只負責簽短效期(10 分鐘)的 signed URL,不重複判斷權限。
 *
 * `download` 帶檔名時,瀏覽器會強制下載而不是直接開啟(給一般檔案附件用);
 * 圖片不用帶,讓它可以直接當 <img src> 顯示。
 */
export async function getAttachmentSignedUrl(
  path: string,
  download?: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(NODE_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 600, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}
