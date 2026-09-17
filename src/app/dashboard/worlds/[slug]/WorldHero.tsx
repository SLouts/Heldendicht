/**
 * 世界觀頁面的 hero 區塊,公開頁面(/worlds/[slug])跟後台頁面
 * (/dashboard/worlds/[slug])共用——跟 worldmap/WorldMapView.tsx 一樣的
 * 「元件放在 dashboard 底下、公開頁面跨路徑 import」慣例。
 *
 * 四個 <div> 都會渲染,實際顯示哪一個交給 globals.css 依
 * <html data-art-theme> 用 CSS 切換(見「Hero 依美術方向切換」那段)——
 * 這樣切換美術方向不用重新整理頁面,也不用在這裡多寫一次 client
 * component 去讀 localStorage。
 */
export function WorldHero({
  name,
  bannerUrl,
  iconUrl,
}: {
  name: string;
  bannerUrl: string | null;
  iconUrl: string | null;
}) {
  return (
    <>
      {/* ---------- 01 泥金手抄本(預設) ---------- */}
      <div className="hero-variant hero-illuminated">
        {!bannerUrl ? (
          <div className="flex items-center gap-3">
            {iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
              <img
                src={iconUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
              />
            )}
            <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
          </div>
        ) : (
          <div className="relative aspect-[16/6] overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
            <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4 sm:p-6">
              {iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
                <img
                  src={iconUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full border-2 border-white/80 object-cover shadow-sm"
                />
              )}
              <h1 className="font-display text-2xl font-semibold tracking-wide text-white drop-shadow-sm sm:text-3xl">
                {name}
              </h1>
            </div>
          </div>
        )}
      </div>

      {/* ---------- 02 劇本手稿:標題頁 ---------- */}
      <div className="hero-variant hero-script rounded-lg border border-border bg-surface px-6 py-10 text-center">
        {iconUrl && !bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            src={iconUrl}
            alt=""
            className="mx-auto mb-4 h-14 w-14 rounded-full border border-border object-cover"
          />
        )}
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Heldendicht</p>
        <h1 className="font-display mt-3 text-3xl font-bold uppercase tracking-wide">{name}</h1>
        <p className="mt-3 text-xs italic text-muted-foreground">眾筆共著</p>
        {bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            src={bannerUrl}
            alt=""
            className="mx-auto mt-6 max-h-56 rounded border border-border object-cover"
          />
        )}
      </div>

      {/* ---------- 03 田野筆記:點格紙扉頁 ---------- */}
      <div className="hero-variant hero-field hero-field-dots rounded-lg border border-border px-6 py-8">
        <div className="flex items-center gap-4">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={iconUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <svg
              width="44"
              height="44"
              viewBox="0 0 46 46"
              className="shrink-0 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <circle cx="23" cy="23" r="18" />
              <path d="M23 23 L30 12" />
              <circle cx="23" cy="23" r="2" fill="currentColor" stroke="none" />
            </svg>
          )}
          <h1 className="font-display text-3xl">{name}</h1>
        </div>
        {bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            src={bannerUrl}
            alt=""
            className="mt-5 max-h-48 w-auto -rotate-1 rounded border border-border object-cover"
          />
        )}
      </div>

      {/* ---------- 04 角色卡牌:卡框 ---------- */}
      <div className="hero-variant hero-card">
        <div className="hero-card-frame">
          <div className="hero-card-titlebar">
            <b className="font-display">{name}</b>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <polygon fill="#4fae8c" points="9,1 16,6 13,17 5,17 2,6" />
            </svg>
          </div>
          <div className="hero-card-art">
            {(bannerUrl || iconUrl) && (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
              <img src={bannerUrl ?? iconUrl ?? undefined} alt="" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
