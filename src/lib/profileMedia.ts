export const PROFILE_MEDIA_BUCKET = "profile-media";
export const PROFILE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_MEDIA_ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * profile-media 是 public bucket,不需要簽 signed URL——直接組公開網址
 * 就能讀,任何人(含沒登入的訪客)都看得到。公開網址是純字串組合(跟
 * Supabase Storage SDK 的 getPublicUrl() 產生的格式一致),不需要呼叫
 * API、也不需要 service_role 權限,所以這個函式刻意不依賴
 * lib/supabase/admin.ts(那個檔案的 server-only 限制會導致任何從
 * Client Component 間接 import 到這裡的地方建置失敗)——FollowListCard
 * 這種「伺服器/客戶端元件都可能用到」的共用元件需要能安全 import 這裡。
 */
export function getProfileMediaPublicUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/${path}`;
}
