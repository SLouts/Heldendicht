import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const WORLD_MAP_BUCKET = "world-maps";
export const WORLD_MAP_MAX_BYTES = 8 * 1024 * 1024;
export const WORLD_MAP_ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * world-maps bucket 是 private 的,沒有任何 anon/authenticated 的
 * storage RLS policy,所以一般使用者沒辦法自己組 URL 讀到底圖 ——
 * 一定要先在呼叫端確認過使用者「看得到這個世界觀」,才呼叫這裡簽一個
 * 短效期(5 分鐘)的 signed URL。
 */
export async function getWorldMapSignedUrl(
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(WORLD_MAP_BUCKET)
    .createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
