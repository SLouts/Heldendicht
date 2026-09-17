import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const WORLD_MEDIA_BUCKET = "world-media";
export const WORLD_BANNER_MAX_BYTES = 8 * 1024 * 1024;
export const WORLD_ICON_MAX_BYTES = 3 * 1024 * 1024;
export const WORLD_MEDIA_ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * world-media bucket 是 private 的,沒有任何 anon/authenticated 的
 * storage RLS policy,所以一般使用者沒辦法自己組 URL 讀到橫幅/Icon ——
 * 一定要先在呼叫端確認過使用者「看得到這個世界觀」(worlds 表的
 * worlds_select_public_or_member RLS 已經幫這件事把關,只要是透過
 * RLS-gated client 查到 world row,就代表看得到),才呼叫這裡簽一個
 * 短效期(5 分鐘)的 signed URL。
 */
export async function getWorldMediaSignedUrl(
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(WORLD_MEDIA_BUCKET)
    .createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
