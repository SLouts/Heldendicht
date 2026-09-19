import { Avatar, BigImage } from "./NodeIdentityCard";

/**
 * PC 寬螢幕版的身分卡側欄——頭貼置中在上、標題在下、大圖再下面,
 * 跟 NodeIdentityCard.tsx(手機版,頭貼在左標題在右的橫向列)是同一組
 * props、不同排版,兩邊各自渲染八份,globals.css 依 <html data-art-theme>
 * +螢幕寬度(lg 斷點,1024px)決定哪一份可見:窄螢幕顯示 NodeIdentityCard
 * 那八份,寬螢幕才切到這裡的八份。
 *
 * 七個版型(除了卡牌)結構其實一樣——頭貼置中、標題、標籤、meta、大圖
 * 由上到下堆疊,只有外層裝飾(劇本手稿的標題列、卷軸的滾棒、製圖師的
 * 羅盤、曆書的星點背景)不同,所以抽成下面的 DesktopIdentityStack 共用;
 * 卡牌牌面(頭貼在左、標題在右的橫幅+分層卡框)結構跟其他七個差太多,
 * 沒有勉強塞進同一個共用元件。
 */
function DesktopIdentityStack({
  avatarUrl,
  avatarClassName,
  name,
  nameClassName,
  typeBadge,
  statusBadges,
  metaLine,
  metaClassName,
  imageUrl,
  imageClassName,
}: {
  avatarUrl: string | null;
  avatarClassName: string;
  name: string;
  nameClassName: string;
  typeBadge: React.ReactNode;
  statusBadges: React.ReactNode;
  metaLine: React.ReactNode;
  metaClassName: string;
  imageUrl: string | null;
  imageClassName: string;
}) {
  return (
    <>
      <Avatar url={avatarUrl} className={avatarClassName} />
      <h1 className={nameClassName}>{name}</h1>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {typeBadge}
        {statusBadges}
      </div>
      <p className={metaClassName}>{metaLine}</p>
      <BigImage url={imageUrl} className={imageClassName} />
    </>
  );
}

export function NodeIdentityCardDesktop({
  name,
  characterType,
  extraBadges,
  nodeTypeLabel,
  categoryName,
  ownerLabel,
  avatarUrl,
  imageUrl,
}: {
  name: string;
  characterType: "pc" | "npc" | null;
  extraBadges?: React.ReactNode;
  nodeTypeLabel: string;
  categoryName: string | null;
  ownerLabel: string | null;
  avatarUrl: string | null;
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
      {/* ---------- 01 泥金手抄本 ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-illuminated node-identity-illuminated-frame rounded-lg border border-border bg-surface p-5 text-center">
        <DesktopIdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="mx-auto h-20 w-20 rounded-full border-2 border-border object-cover"
          name={name}
          nameClassName="font-display mt-3 text-xl font-semibold text-primary"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-sm text-muted-foreground italic"
          imageUrl={imageUrl}
          imageClassName="mt-4 aspect-3/4 w-full rounded border border-border object-cover"
        />
      </div>

      {/* ---------- 02 劇本手稿:標題頁 ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-script border border-border bg-surface">
        <div className="node-identity-script-masthead">
          {characterType ? "Character Sheet" : "Field Record"}
        </div>
        <div className="p-4 text-center">
          <DesktopIdentityStack
            avatarUrl={avatarUrl}
            avatarClassName="mx-auto h-20 w-20 border border-border object-cover"
            name={name}
            nameClassName="font-display mt-3 text-xl font-semibold uppercase"
            typeBadge={typeBadge}
            statusBadges={statusBadges}
            metaLine={metaLine}
            metaClassName="mt-1 text-xs uppercase tracking-wide text-muted-foreground"
            imageUrl={imageUrl}
            imageClassName="mt-4 aspect-3/4 w-full border border-border object-cover"
          />
        </div>
      </div>

      {/* ---------- 03 田野筆記:點格紙 ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-field hero-field-dots rounded-lg border border-border p-5 text-center">
        <DesktopIdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="mx-auto h-20 w-20 rounded-full border border-border object-cover"
          name={name}
          nameClassName="font-display mt-3 text-xl"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-sm text-muted-foreground"
          imageUrl={imageUrl}
          imageClassName="mt-4 aspect-3/4 w-full rounded border border-border object-cover"
        />
      </div>

      {/* ---------- 04 角色卡牌:卡框(頭貼在左、標題在右,跟其他版型不同) ---------- */}
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

      {/* ---------- 05 東方玄幻:硃砂印 ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-wuxia rounded-none border border-border bg-surface p-5 text-center">
        <DesktopIdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="hero-wuxia-seal mx-auto rounded-full object-cover"
          name={name}
          nameClassName="font-display mt-3 text-xl font-semibold"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-sm text-muted-foreground"
          imageUrl={imageUrl}
          imageClassName="mt-4 aspect-3/4 w-full object-cover"
        />
      </div>

      {/* ---------- 06 羊皮紙卷軸:攤開的卷軸 ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-scroll">
        <div className="hero-scroll-rod" />
        <div className="bg-surface px-5 py-6 text-center">
          <DesktopIdentityStack
            avatarUrl={avatarUrl}
            avatarClassName="mx-auto h-20 w-20 rounded-full border border-border object-cover"
            name={name}
            nameClassName="font-display mt-3 text-xl"
            typeBadge={typeBadge}
            statusBadges={statusBadges}
            metaLine={metaLine}
            metaClassName="mt-1 text-sm text-muted-foreground italic"
            imageUrl={imageUrl}
            imageClassName="mx-auto mt-4 aspect-3/4 w-full max-w-[220px] rounded border border-border object-cover"
          />
        </div>
        <div className="hero-scroll-rod" />
      </div>

      {/* ---------- 07 製圖師手記:方格野帳 + 羅盤 ---------- */}
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
        <DesktopIdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="mx-auto h-20 w-20 border-2 border-border object-cover"
          name={name}
          nameClassName="font-display mt-3 text-xl font-bold uppercase"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-xs uppercase tracking-wide text-muted-foreground"
          imageUrl={imageUrl}
          imageClassName="mt-4 aspect-3/4 w-full border-2 border-border object-cover"
        />
      </div>

      {/* ---------- 08 占星曆書:星點夜色 ---------- */}
      <div className="node-identity-desktop-variant node-identity-desktop-almanac">
        <div className="hero-almanac-sky text-center">
          <DesktopIdentityStack
            avatarUrl={avatarUrl}
            avatarClassName="mx-auto h-20 w-20 rounded-full border border-border object-cover"
            name={name}
            nameClassName="font-display mt-3 text-xl font-semibold italic"
            typeBadge={typeBadge}
            statusBadges={statusBadges}
            metaLine={metaLine}
            metaClassName="hero-almanac-tagline text-center"
            imageUrl={imageUrl}
            imageClassName="mt-4 aspect-3/4 w-full rounded border border-border object-cover"
          />
        </div>
      </div>
    </>
  );
}
