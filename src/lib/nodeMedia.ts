import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const NODE_MEDIA_BUCKET = "node-media";
export const NODE_ILLUSTRATION_MAX_BYTES = 8 * 1024 * 1024;
export const NODE_AVATAR_MAX_BYTES = 3 * 1024 * 1024;
export const NODE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const NODE_TIMELINE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const NODE_MEDIA_ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * node-media bucket 是 private 的,沒有任何 anon/authenticated 的
 * storage RLS policy,所以一般使用者沒辦法自己組 URL 讀到頭貼/立繪/代表圖
 * ——一定要先在呼叫端確認過使用者「看得到這個節點」(nodes 表的
 * nodes_select_visible RLS 已經幫這件事把關,只要是透過 RLS-gated client
 * 查到 node row,就代表看得到),才呼叫這裡簽一個短效期(5 分鐘)的
 * signed URL。
 */
export async function getNodeMediaSignedUrl(
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(NODE_MEDIA_BUCKET)
    .createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
