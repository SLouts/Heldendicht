import Link from "next/link";

/** 跨世界觀 PC 展示頁頂部——本尊大頭貼、名字、引言,附「原創作者」連回擁有者的個人頁。 */
export function PersonaHero({
  name,
  tagline,
  avatarUrl,
  ownerUsername,
  ownerLabel,
}: {
  name: string;
  tagline: string | null;
  avatarUrl: string | null;
  ownerUsername: string | null;
  ownerLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-4 sm:items-center">
      <div className="h-20 w-20 shrink-0 sm:h-24 sm:w-24">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed/public 網址,無法用 next/image 白名單網域
          <img
            src={avatarUrl}
            alt={name}
            className="h-full w-full rounded-full border border-border object-cover"
          />
        ) : (
          <div className="h-full w-full rounded-full border border-border bg-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{name}</h1>
          <span className="rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg">
            原創角色
          </span>
        </div>
        {tagline && (
          <p className="mt-1 italic text-muted-foreground">「{tagline}」</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          本尊由{" "}
          {ownerUsername ? (
            <Link href={`/u/${ownerUsername}`} className="underline hover:no-underline">
              @{ownerUsername}
            </Link>
          ) : (
            ownerLabel
          )}{" "}
          建立
        </p>
      </div>
    </div>
  );
}
