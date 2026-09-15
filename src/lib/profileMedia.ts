import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const PROFILE_MEDIA_BUCKET = "profile-media";
export const PROFILE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_MEDIA_ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * profile-media 是 public bucket,不需要簽 signed URL——直接組公開網址
 * 就能讀,任何人(含沒登入的訪客)都看得到。
 */
export function getProfileMediaPublicUrl(path: string | null): string | null {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = admin.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
