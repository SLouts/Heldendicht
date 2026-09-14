"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";
import {
  NODE_ATTACHMENTS_BUCKET,
  NODE_ATTACHMENT_MAX_BYTES,
  NODE_ATTACHMENT_ALLOWED_TYPES,
} from "@/lib/attachments";

export type AttachmentFormState = { error: string } | undefined;

/**
 * 上傳節點附件(圖片或 PDF)。誰能上傳完全比照「誰能編輯這個節點的內文」
 * (can_edit_node),不是限 staff —— 跟世界地圖底圖(限 admin)不一樣。
 */
export async function uploadNodeAttachment(
  _prevState: AttachmentFormState,
  formData: FormData,
): Promise<AttachmentFormState> {
  const user = await requireUser();

  const nodeId = formData.get("nodeId");
  const worldSlug = formData.get("worldSlug");
  const nodeSlug = formData.get("nodeSlug");
  const file = formData.get("file");

  if (
    typeof nodeId !== "string" ||
    typeof worldSlug !== "string" ||
    typeof nodeSlug !== "string" ||
    !(file instanceof File)
  ) {
    return { error: "缺少必要欄位" };
  }
  if (file.size === 0) {
    return { error: "請選擇一個檔案" };
  }
  if (file.size > NODE_ATTACHMENT_MAX_BYTES) {
    return { error: "檔案不能超過 10MB" };
  }
  const typeInfo = NODE_ATTACHMENT_ALLOWED_TYPES[file.type];
  if (!typeInfo) {
    return { error: "只接受 PNG / JPEG / WebP 圖片或 PDF 文件" };
  }

  const supabase = await createClient();

  const { data: canEdit } = await supabase.rpc("can_edit_node", {
    p_node_id: nodeId,
  });
  if (!canEdit) {
    return { error: "你沒有權限編輯這個節點,無法上傳附件" };
  }

  const { data: node } = await supabase
    .from("nodes")
    .select("world_id")
    .eq("id", nodeId)
    .maybeSingle();
  if (!node) {
    return { error: "找不到這個節點" };
  }

  const admin = createAdminClient();
  const path = `${node.world_id}/${nodeId}/${Date.now()}-${crypto.randomUUID()}.${typeInfo.ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(NODE_ATTACHMENTS_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { error: "上傳失敗,請稍後再試" };
  }

  const { error: insertError } = await supabase.from("node_attachments").insert({
    node_id: nodeId,
    world_id: node.world_id,
    storage_path: path,
    file_name: file.name || `檔案.${typeInfo.ext}`,
    content_type: file.type,
    file_size: file.size,
    kind: typeInfo.kind,
    uploader_id: user.id,
  });

  if (insertError) {
    await admin.storage.from(NODE_ATTACHMENTS_BUCKET).remove([path]);
    return { error: "儲存附件資料失敗,請稍後再試" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  return undefined;
}

/** 刪除節點附件。權限一樣是 can_edit_node,不限上傳者本人,由 node_attachments_delete RLS policy 把關。 */
export async function deleteNodeAttachment(
  attachmentId: string,
  worldSlug: string,
  nodeSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { data: attachment } = await supabase
    .from("node_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle();

  const { error, count } = await supabase
    .from("node_attachments")
    .delete({ count: "exact" })
    .eq("id", attachmentId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限刪除這個附件");
  }

  if (attachment?.storage_path) {
    const admin = createAdminClient();
    await admin.storage
      .from(NODE_ATTACHMENTS_BUCKET)
      .remove([attachment.storage_path]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
}
