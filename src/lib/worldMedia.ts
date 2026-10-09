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

/**
 * 一次幫多個世界觀簽橫幅/Icon 的 URL——個人頁面的世界觀卡片清單、
 * /u/[username]/worlds 整頁展示都要簽一整批,不要各自重寫一次
 * Promise.all(worlds.map(...)) 展開/對齊的邏輯。呼叫端一樣要先確認過
 * 這批世界觀是自己看得到的(見 getWorldMediaSignedUrl 的說明)。
 */
export async function getWorldMediaSignedUrls(
  worlds: { banner_path: string | null; icon_path: string | null }[],
): Promise<{ bannerUrl: string | null; iconUrl: string | null }[]> {
  return Promise.all(
    worlds.map(async (w) => ({
      bannerUrl: await getWorldMediaSignedUrl(w.banner_path),
      iconUrl: await getWorldMediaSignedUrl(w.icon_path),
    })),
  );
}

/**
 * 專門給 og:image 用的簽名 URL——效期比一般的 5 分鐘長很多(1 小時),
 * 因為分享連結被 Discord/搜尋引擎等外部服務抓取的時間點不可預期,5 分鐘
 * 太容易過期變成破圖。只給「公開世界觀」的橫幅呼叫這個函式——公開世界觀
 * 的橫幅本來就是任何人都看得到的內容,延長這張圖單獨的簽名效期不會
 * 洩漏非公開資料;私人世界觀不要呼叫這個函式。
 */
export async function getWorldOgImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from(WORLD_MEDIA_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
