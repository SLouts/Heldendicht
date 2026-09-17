/**
 * 世界觀首頁的 hero 區塊,公開頁面(/worlds/[slug])跟後台頁面
 * (/dashboard/worlds/[slug])共用——跟 worldmap/WorldMapView.tsx 一樣的
 * 「元件放在 dashboard 底下、公開頁面跨路徑 import」慣例。沒有橫幅圖時
 * 退回原本純文字標題的樣子,不強迫每個世界觀都要有橫幅才好看。
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
  if (!bannerUrl) {
    return (
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
    );
  }

  return (
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
  );
}
