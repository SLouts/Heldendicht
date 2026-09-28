import Link from "next/link";

/**
 * 世界觀展示卡片——個人頁面「參加的企劃」區塊、跟 /u/[username]/worlds
 * 整頁展示共用同一張卡片,不重複刻兩份版面。純展示用,沒有橫幅/Icon
 * 就退回跟個人頁面橫幅同一套的漸層色塊/純色圓框,不佔位失敗。
 */
export function WorldCard({
  slug,
  name,
  tagline,
  bannerUrl,
  iconUrl,
  badge,
}: {
  slug: string;
  name: string;
  tagline?: string | null;
  bannerUrl?: string | null;
  iconUrl?: string | null;
  badge?: string;
}) {
  return (
    <Link
      href={`/worlds/${slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition hover:border-primary/50"
    >
      <div
        className="aspect-[16/6] w-full bg-cover bg-center"
        style={
          bannerUrl
            ? { backgroundImage: `url(${bannerUrl})` }
            : { background: "linear-gradient(135deg, var(--primary), var(--muted))" }
        }
      />
      <div className="flex items-start gap-3 p-4">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            src={iconUrl}
            alt=""
            className="-mt-8 h-12 w-12 shrink-0 rounded-full border-2 border-surface object-cover shadow-sm"
          />
        ) : (
          <div className="-mt-8 h-12 w-12 shrink-0 rounded-full border-2 border-surface bg-muted shadow-sm" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium group-hover:underline">{name}</span>
            {badge && (
              <span className="shrink-0 text-xs text-muted-foreground">{badge}</span>
            )}
          </div>
          {tagline && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{tagline}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
