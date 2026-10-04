"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";
import {
  MESSAGE_ATTACHMENTS_BUCKET,
  MESSAGE_ATTACHMENT_MAX_BYTES,
  MESSAGE_ATTACHMENT_ALLOWED_TYPES,
} from "@/lib/messageAttachments";

export type SendMessageState =
  | { error: string }
  | { success: true }
  | undefined;

const AttachmentSchema = z.object({
  path: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

const SendMessageSchema = z
  .object({
    recipientId: z.uuid(),
    content: z.string().trim(),
    attachments: z.array(AttachmentSchema),
  })
  .refine((v) => v.content.length > 0 || v.attachments.length > 0, {
    error: "訊息不能是空的,至少要有文字或一個附件",
  });

/**
 * 傳送站內私訊,可以附加圖片/檔案——瀏覽器已經透過兩段式簽名上傳把檔案
 * 傳到 message-attachments bucket(見 createMessageAttachmentUploadTicket),
 * 這裡只需要建立訊息本身,再用剛拿到的 id 把附件 metadata 寫進
 * direct_message_attachments。「不能傳給自己」由 direct_messages 的
 * check constraint 把關,這裡的檢查只是提早給好懂的錯誤訊息。
 */
export async function sendMessage(
  _prevState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const user = await requireUser();

  let attachments: z.infer<typeof AttachmentSchema>[] = [];
  const attachmentsRaw = formData.get("attachments");
  if (typeof attachmentsRaw === "string" && attachmentsRaw) {
    try {
      attachments = JSON.parse(attachmentsRaw);
    } catch {
      return { error: "附件資料格式錯誤,請重新選擇檔案" };
    }
  }

  const parsed = SendMessageSchema.safeParse({
    recipientId: formData.get("recipientId"),
    content: formData.get("content") ?? "",
    attachments,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "訊息不能是空的" };
  }
  if (parsed.data.recipientId === user.id) {
    return { error: "不能傳訊息給自己" };
  }

  const supabase = await createClient();
  const { data: message, error } = await supabase
    .from("direct_messages")
    .insert({
      sender_id: user.id,
      recipient_id: parsed.data.recipientId,
      content: parsed.data.content,
    })
    .select("id")
    .single();
  if (error || !message) {
    return { error: "傳送失敗,請稍後再試" };
  }

  if (parsed.data.attachments.length > 0) {
    const rows = parsed.data.attachments.flatMap((a) => {
      const typeInfo = MESSAGE_ATTACHMENT_ALLOWED_TYPES[a.contentType];
      if (!typeInfo) return [];
      return [
        {
          message_id: message.id,
          storage_path: a.path,
          file_name: a.fileName,
          content_type: a.contentType,
          file_size: a.fileSize,
          kind: typeInfo.kind,
          uploader_id: user.id,
        },
      ];
    });
    const { error: attachError } = await supabase
      .from("direct_message_attachments")
      .insert(rows);
    if (attachError) {
      const admin = createAdminClient();
      await admin.storage
        .from(MESSAGE_ATTACHMENTS_BUCKET)
        .remove(rows.map((r) => r.storage_path));
      return { error: "訊息已送出,但附件儲存失敗,請重新傳送附件" };
    }
  }

  revalidatePath(`/dashboard/messages/${parsed.data.recipientId}`);
  revalidatePath("/dashboard/messages");
  return { success: true };
}

export type MessageAttachmentUploadTicketResult =
  | { error: string }
  | { path: string; token: string };

/**
 * 私訊附加圖片/檔案(上限 10MB)的兩段式上傳——先跟這裡要簽名上傳票券,
 * 瀏覽器直接把檔案傳到 Supabase Storage,不經過我們自己的 server,原因
 * 見 lib/actions/attachments.ts createNodeAttachmentUploadTicket 的說明。
 *
 * 這時訊息本身還沒建立(使用者可能正在打字、還沒按傳送),所以路徑用
 * 「自己 id / 對方 id / 時間戳記」定位這次對話,不是用 message_id——
 * 附件真正寫進資料庫、綁定某一則訊息,要等 sendMessage 建立訊息之後。
 */
export async function createMessageAttachmentUploadTicket(
  recipientId: string,
  contentType: string,
  fileSize: number,
): Promise<MessageAttachmentUploadTicketResult> {
  const user = await requireUser();

  if (fileSize <= 0) {
    return { error: "請選擇一個檔案" };
  }
  if (fileSize > MESSAGE_ATTACHMENT_MAX_BYTES) {
    return { error: "檔案不能超過 10MB" };
  }
  const typeInfo = MESSAGE_ATTACHMENT_ALLOWED_TYPES[contentType];
  if (!typeInfo) {
    return { error: "只接受 PNG / JPEG / WebP 圖片或 PDF 文件" };
  }

  const admin = createAdminClient();
  const path = `${user.id}/${recipientId}/${Date.now()}-${crypto.randomUUID()}.${typeInfo.ext}`;
  const { data, error } = await admin.storage
    .from(MESSAGE_ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return { error: "無法建立上傳票券,請稍後再試" };
  }

  return { path: data.path, token: data.token };
}
