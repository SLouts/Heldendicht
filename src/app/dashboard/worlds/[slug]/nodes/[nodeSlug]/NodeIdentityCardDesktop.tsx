import { IdentityStack, Avatar, BigImage } from "./NodeIdentityCard";

/**
 * PC 寬螢幕版的身分卡側欄。跟 NodeIdentityCard.tsx(手機版)是同一組
 * props、共用同一份 Banner/IdentityStack 堆疊,兩邊各自渲染八份,
 * globals.css 依 <html data-art-theme> +螢幕寬度(lg 斷點,1024px)決定
 * 哪一份可見:窄螢幕顯示 NodeIdentityCard 那八份,寬螢幕才切到這裡的
 * 八份。差異只剩頭貼/封面尺寸(這裡更大)跟少數版型的 className 細節。
 *
 * 卡牌牌面(04)跟手機版一樣是獨立手寫的特例,沒有橫幅。
 */
export function NodeIdentityCardDesktop({
  name,
  characterType,
  extraBadges,
  nodeTypeLabel,
  categoryName,
  ownerLabel,
  avatarUrl,
  coverUrl,
  imageUrl,
}: {
  name: string;
  characterType: "pc" | "npc" | null;
  extraBadges?: React.ReactNode;
  nodeTypeLabel: string;
  categoryName: string | null;
  ownerLabel: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  imageUrl: string | null;
}) {
  const typeBadge = characterType && (
    <span
      className={
        characterType === "pc"
          ? "rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg"
          : "rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg"
      }
    >
      {characterType === "pc" ? "PC" : "NPC"}
    </span>
  );
  const metaLine = (
    <>
      {nodeTypeLabel}
      {categoryName && <> ・分類:{categoryName}</>}
      {ownerLabel && <> ・擁有者:{ownerLabel}</>}
    </>
  );
  const statusBadges = extraBadges;

  return (
    <>
      {/* ---------- 01 illuminated ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-illuminated node-identity-illuminated-frame rounded-lg border border-border bg-surface p-5 text-center">
        <IdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="h-24 w-24 shrink-0 rounded-full border-2 border-border object-cover"
          coverUrl={coverUrl}
          coverClassName="h-24 flex-1 rounded border border-border object-cover"
          bannerClassName="flex items-center justify-center gap-3"
          name={name}
          nameClassName="font-display mt-3 text-xl font-semibold text-primary"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-sm text-muted-foreground italic"
          imageUrl={imageUrl}
          imageClassName="mt-4 w-full rounded border border-border"
        />
      </div>

      {/* ---------- 02 script ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-script border border-border bg-surface">
        <div className="node-identity-script-masthead">
          {characterType ? "Character Sheet" : "Field Record"}
        </div>
        <div className="p-4 text-center">
          <IdentityStack
            avatarUrl={avatarUrl}
            avatarClassName="h-24 w-24 shrink-0 border border-border object-cover"
            coverUrl={coverUrl}
            coverClassName="h-24 flex-1 border border-border object-cover"
            bannerClassName="flex items-center justify-center gap-3"
            name={name}
            nameClassName="font-display mt-3 text-xl font-semibold uppercase"
            typeBadge={typeBadge}
            statusBadges={statusBadges}
            metaLine={metaLine}
            metaClassName="mt-1 text-xs uppercase tracking-wide text-muted-foreground"
            imageUrl={imageUrl}
            imageClassName="mt-4 w-full border border-border"
          />
        </div>
      </div>

      {/* ---------- 03 field ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-field hero-field-dots rounded-lg border border-border p-5 text-center">
        <IdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="h-24 w-24 shrink-0 rounded-full border border-border object-cover"
          coverUrl={coverUrl}
          coverClassName="h-24 flex-1 rounded border border-border object-cover"
          bannerClassName="flex items-center justify-center gap-3"
          name={name}
          nameClassName="font-display mt-3 text-xl"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-sm text-muted-foreground"
          imageUrl={imageUrl}
          imageClassName="mt-4 w-full rounded border border-border"
        />
      </div>

      {/* ---------- 04 角色卡牌:卡框(頭貼在左、標題在右,跟其他版型不同,
           沒有橫幅,封面暫不顯示) ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-card">
        <div className="hero-card-frame">
          <div className="flex items-center gap-3 px-2 pt-1.5 pb-2.5">
            <Avatar
              url={avatarUrl}
              className="h-9 w-9 shrink-0 rounded-full border border-[#b6912f] object-cover"
            />
            <b className="font-display flex-grow text-xl uppercase tracking-wide">{name}</b>
          </div>
          <BigImage url={imageUrl} wrapperClassName="hero-card-art" />
          {characterType && (
            <div className="mt-2.5 flex flex-wrap gap-2 px-1">
              <span className="rounded border border-[#b6912f] bg-[#241f14] px-2 py-0.5 text-xs text-[#e9dfc4]">
                {characterType === "pc" ? "PC" : "NPC"}
              </span>
            </div>
          )}
        </div>
        <div className="rounded-b-lg border border-t-0 border-border bg-surface px-4 py-3">
          <p className="text-xs text-muted-foreground">{metaLine}</p>
          {statusBadges && <div className="mt-2 flex flex-wrap gap-2">{statusBadges}</div>}
        </div>
      </div>

      {/* ---------- 05 wuxia ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-wuxia rounded-none border border-border bg-surface p-5 text-center">
        <IdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="hero-wuxia-seal rounded-full object-cover"
          coverUrl={coverUrl}
          coverClassName="h-11 flex-1 object-cover"
          bannerClassName="flex items-center justify-center gap-3"
          name={name}
          nameClassName="font-display mt-3 text-xl font-semibold"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-sm text-muted-foreground"
          imageUrl={imageUrl}
          imageClassName="mt-4 w-full"
        />
      </div>

      {/* ---------- 06 scroll ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-scroll">
        <div className="hero-scroll-rod" />
        <div className="bg-surface px-5 py-6 text-center">
          <IdentityStack
            avatarUrl={avatarUrl}
            avatarClassName="h-24 w-24 shrink-0 rounded-full border border-border object-cover"
            coverUrl={coverUrl}
            coverClassName="h-24 flex-1 rounded border border-border object-cover"
            bannerClassName="mx-auto flex max-w-xs items-center justify-center gap-3"
            name={name}
            nameClassName="font-display mt-3 text-xl"
            typeBadge={typeBadge}
            statusBadges={statusBadges}
            metaLine={metaLine}
            metaClassName="mt-1 text-sm text-muted-foreground italic"
            imageUrl={imageUrl}
            imageClassName="mx-auto mt-4 w-full max-w-[220px] rounded border border-border"
          />
        </div>
        <div className="hero-scroll-rod" />
      </div>

      {/* ---------- 07 cartographer ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-cartographer hero-cartographer-grid relative rounded-none border-2 border-border p-5 text-center">
        <svg
          className="hero-cartographer-compass"
          viewBox="0 0 34 34"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="17" cy="17" r="14" strokeWidth="1" />
          <path d="M17 4 L20 17 L17 30 L14 17 Z" fill="currentColor" stroke="none" opacity=".7" />
          <path d="M4 17 L17 15 L30 17 L17 19 Z" fill="currentColor" stroke="none" opacity=".35" />
        </svg>
        <IdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="h-24 w-24 shrink-0 border-2 border-border object-cover"
          coverUrl={coverUrl}
          coverClassName="h-24 flex-1 border-2 border-border object-cover"
          bannerClassName="flex items-center justify-center gap-3"
          name={name}
          nameClassName="font-display mt-3 text-xl font-bold uppercase"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-xs uppercase tracking-wide text-muted-foreground"
          imageUrl={imageUrl}
          imageClassName="mt-4 w-full border-2 border-border"
        />
      </div>

      {/* ---------- 08 almanac ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-almanac">
        <div className="hero-almanac-sky text-center">
          <IdentityStack
            avatarUrl={avatarUrl}
            avatarClassName="h-24 w-24 shrink-0 rounded-full border border-border object-cover"
            coverUrl={coverUrl}
            coverClassName="h-24 flex-1 rounded border border-border object-cover"
            bannerClassName="flex items-center justify-center gap-3"
            name={name}
            nameClassName="font-display mt-3 text-xl font-semibold italic"
            typeBadge={typeBadge}
            statusBadges={statusBadges}
            metaLine={metaLine}
            metaClassName="hero-almanac-tagline text-center"
            imageUrl={imageUrl}
            imageClassName="mt-4 w-full rounded border border-border"
          />
        </div>
      </div>
    </>
  );
}
