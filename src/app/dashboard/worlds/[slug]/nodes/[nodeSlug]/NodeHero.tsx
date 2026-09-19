/**
 * 節點頁面最上方的「身分橫幅」——封面橫跨全寬、頭貼疊在橫幅底部(壓一半
 * 在圖上、一半露到下面的白底區),標題跟引言(節點內文)在橫幅下面,
 * 依美術方向切換版型。跟 WorldHero.tsx 同一個慣例:八份 <div> 都會
 * 渲染,實際顯示哪一份交給 globals.css 依 <html data-art-theme> 用 CSS
 * 切換。手機/PC 共用同一份 DOM,靠 Tailwind 響應式 class 微調,不用
 * 像身分卡卡片時代那樣另外渲染一份 desktop 專用 DOM。
 *
 * characterType 為 null 代表不是角色節點——不顯示 PC/NPC 標籤,也不會有
 * avatarUrl(一般節點沒有頭貼欄位,它的代表圖直接當封面/橫幅用)。
 *
 * 封面(coverUrl)/頭貼(avatarUrl)都選填,沒有上傳就不佔位:兩個都沒有
 * 就只剩標題文字區塊;只有頭貼沒封面,頭貼變成標題左邊的小圖示(不疊
 * 在任何東西上面);兩個都有才會是「封面橫幅+頭貼疊底部」的效果。
 *
 * quote 是呼叫端已經用 WikiLinkContent 轉換好的節點內文(可能含
 * wikilink/嵌入圖片),這裡只負責包引言框的樣式——編輯模式不會傳這個,
 * 因為編輯者在下面的表單就看得到內文,不需要在橫幅重複顯示一次。
 *
 * 七個版型(除了卡牌)結構相同,抽成 HeroFrame 共用;卡牌牌面沿用
 * WorldHero.tsx 既有的深色卡框+標題列+16:6 橫幅裁切,結構差太多維持
 * 獨立手寫。
 */

function Avatar({ url, className }: { url: string | null; className: string }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
  return <img src={url} alt="" className={className} />;
}

/** 七個版型(除了卡牌)共用的橫幅+標題堆疊。 */
function HeroFrame({
  outerClassName,
  coverUrl,
  coverWrapperClassName,
  coverImgClassName,
  avatarUrl,
  avatarOverlapClassName,
  avatarInlineClassName,
  bodyClassName,
  bodyWithOverlapClassName,
  name,
  nameClassName,
  typeBadge,
  statusBadges,
  metaLine,
  metaClassName,
  quote,
}: {
  outerClassName: string;
  coverUrl: string | null;
  coverWrapperClassName: string;
  coverImgClassName: string;
  avatarUrl: string | null;
  avatarOverlapClassName: string;
  avatarInlineClassName: string;
  bodyClassName: string;
  bodyWithOverlapClassName: string;
  name: string;
  nameClassName: string;
  typeBadge: React.ReactNode;
  statusBadges: React.ReactNode;
  metaLine: React.ReactNode;
  metaClassName: string;
  quote: React.ReactNode;
}) {
  const hasOverlap = Boolean(coverUrl && avatarUrl);
  return (
    <div className={outerClassName}>
      {coverUrl && (
        <div className={coverWrapperClassName}>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
          <img src={coverUrl} alt="" className={coverImgClassName} />
          <Avatar url={avatarUrl} className={avatarOverlapClassName} />
        </div>
      )}
      <div className={hasOverlap ? bodyWithOverlapClassName : bodyClassName}>
        {!coverUrl && <Avatar url={avatarUrl} className={avatarInlineClassName} />}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className={nameClassName}>{name}</h1>
          {typeBadge}
          {statusBadges}
        </div>
        <p className={metaClassName}>{metaLine}</p>
        {quote}
      </div>
    </div>
  );
}

export function NodeHero({
  name,
  characterType,
  extraBadges,
  nodeTypeLabel,
  categoryName,
  ownerLabel,
  avatarUrl,
  coverUrl,
  quote,
}: {
  name: string;
  /** null = 不是角色節點,不顯示 PC/NPC 標籤。 */
  characterType: "pc" | "npc" | null;
  /** 狀態/佔位等其他標籤,樣式由呼叫端決定(跟原本標題列同一套 badge 慣例)。 */
  extraBadges?: React.ReactNode;
  nodeTypeLabel: string;
  categoryName: string | null;
  ownerLabel: string | null;
  /** 只有角色節點才有頭貼;一般節點一律傳 null。 */
  avatarUrl: string | null;
  /** 封面/橫幅——角色節點是代表圖(image_path),一般節點也是代表圖,
   * 兩種節點都直接當橫幅用。 */
  coverUrl: string | null;
  /** 已經轉換好的節點內文引言區塊(唯讀時才傳,編輯模式傳 null)。 */
  quote: React.ReactNode;
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
      {/* ---------- 01 泥金手抄本(預設) ---------- */}
      <HeroFrame
        outerClassName="node-hero-variant node-hero-illuminated overflow-hidden rounded-lg border border-border bg-surface"
        coverUrl={coverUrl}
        coverWrapperClassName="relative aspect-[16/5] w-full overflow-hidden"
        coverImgClassName="absolute inset-0 h-full w-full object-cover"
        avatarUrl={avatarUrl}
        avatarOverlapClassName="absolute -bottom-8 left-6 h-20 w-20 rounded-full border-4 border-surface object-cover shadow-sm"
        avatarInlineClassName="mb-3 h-16 w-16 rounded-full border-2 border-border object-cover"
        bodyClassName="px-6 py-6"
        bodyWithOverlapClassName="px-6 pb-6 pt-12"
        name={name}
        nameClassName="font-display text-2xl font-semibold text-primary sm:text-3xl"
        typeBadge={typeBadge}
        statusBadges={statusBadges}
        metaLine={metaLine}
        metaClassName="mt-1 text-sm text-muted-foreground italic"
        quote={quote}
      />

      {/* ---------- 02 劇本手稿:標題頁(標題列在橫幅上方) ---------- */}
      <div className="node-hero-variant node-hero-script overflow-hidden border border-border bg-surface">
        <div className="node-hero-script-masthead">
          {characterType ? "Character Sheet" : "Field Record"}
        </div>
        <HeroFrame
          outerClassName=""
          coverUrl={coverUrl}
          coverWrapperClassName="relative aspect-[16/5] w-full overflow-hidden"
          coverImgClassName="absolute inset-0 h-full w-full object-cover"
          avatarUrl={avatarUrl}
          avatarOverlapClassName="absolute -bottom-8 left-6 h-20 w-20 border-4 border-surface object-cover shadow-sm"
          avatarInlineClassName="mb-3 h-16 w-16 border border-border object-cover"
          bodyClassName="px-6 py-6"
          bodyWithOverlapClassName="px-6 pb-6 pt-12"
          name={name}
          nameClassName="font-display text-2xl font-semibold uppercase sm:text-3xl"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-xs uppercase tracking-wide text-muted-foreground"
          quote={quote}
        />
      </div>

      {/* ---------- 03 田野筆記:點格紙 ---------- */}
      <HeroFrame
        outerClassName="node-hero-variant node-hero-field hero-field-dots overflow-hidden rounded-lg border border-border"
        coverUrl={coverUrl}
        coverWrapperClassName="relative aspect-[16/5] w-full overflow-hidden"
        coverImgClassName="absolute inset-0 h-full w-full -rotate-1 object-cover"
        avatarUrl={avatarUrl}
        avatarOverlapClassName="absolute -bottom-8 left-6 h-20 w-20 rounded-full border-4 border-background object-cover shadow-sm"
        avatarInlineClassName="mb-3 h-16 w-16 rounded-full border border-border object-cover"
        bodyClassName="px-6 py-6"
        bodyWithOverlapClassName="px-6 pb-6 pt-12"
        name={name}
        nameClassName="font-display text-2xl sm:text-3xl"
        typeBadge={typeBadge}
        statusBadges={statusBadges}
        metaLine={metaLine}
        metaClassName="mt-1 text-sm text-muted-foreground"
        quote={quote}
      />

      {/* ---------- 04 角色卡牌:卡框(跟 WorldHero.tsx 的卡牌 hero 同一套
           深色卡框+16:6 橫幅裁切,結構差太多維持獨立手寫) ---------- */}
      <div className="node-hero-variant node-hero-card">
        <div className="hero-card-frame">
          <div className="hero-card-titlebar">
            <div className="flex items-center gap-2">
              <Avatar
                url={avatarUrl}
                className="h-9 w-9 shrink-0 rounded-full border border-[#b6912f] object-cover"
              />
              <b className="font-display">{name}</b>
            </div>
            {characterType && (
              <span className="rounded border border-[#b6912f] bg-[#241f14] px-2 py-0.5 text-xs text-[#e9dfc4]">
                {characterType === "pc" ? "PC" : "NPC"}
              </span>
            )}
          </div>
          {coverUrl && (
            <div className="hero-card-art">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
              <img src={coverUrl} alt="" />
            </div>
          )}
        </div>
        <div className="rounded-b-lg border border-t-0 border-border bg-surface px-4 py-3">
          <p className="text-xs text-muted-foreground">{metaLine}</p>
          {statusBadges && <div className="mt-2 flex flex-wrap gap-2">{statusBadges}</div>}
          {quote && <div className="mt-3 border-t border-border pt-3">{quote}</div>}
        </div>
      </div>

      {/* ---------- 05 東方玄幻:硃砂印 ---------- */}
      <HeroFrame
        outerClassName="node-hero-variant node-hero-wuxia overflow-hidden rounded-none border border-border bg-surface"
        coverUrl={coverUrl}
        coverWrapperClassName="relative aspect-[16/5] w-full overflow-hidden"
        coverImgClassName="absolute inset-0 h-full w-full object-cover"
        avatarUrl={avatarUrl}
        avatarOverlapClassName="hero-wuxia-seal absolute -bottom-4 left-6 rounded-full border-2 border-surface object-cover shadow-sm"
        avatarInlineClassName="hero-wuxia-seal mb-3 rounded-full object-cover"
        bodyClassName="px-6 py-6"
        bodyWithOverlapClassName="px-6 pb-6 pt-8"
        name={name}
        nameClassName="font-display text-2xl font-semibold sm:text-3xl"
        typeBadge={typeBadge}
        statusBadges={statusBadges}
        metaLine={metaLine}
        metaClassName="mt-1 text-sm text-muted-foreground"
        quote={quote}
      />

      {/* ---------- 06 羊皮紙卷軸:攤開的卷軸 ---------- */}
      <div className="node-hero-variant node-hero-scroll">
        <div className="hero-scroll-rod" />
        <HeroFrame
          outerClassName="bg-surface"
          coverUrl={coverUrl}
          coverWrapperClassName="relative aspect-[16/5] w-full overflow-hidden"
          coverImgClassName="absolute inset-0 h-full w-full object-cover"
          avatarUrl={avatarUrl}
          avatarOverlapClassName="absolute -bottom-8 left-6 h-20 w-20 rounded-full border-4 border-surface object-cover shadow-sm"
          avatarInlineClassName="mb-3 h-16 w-16 rounded-full border border-border object-cover"
          bodyClassName="px-6 py-6 text-center"
          bodyWithOverlapClassName="px-6 pb-6 pt-12 text-center"
          name={name}
          nameClassName="font-display text-2xl sm:text-3xl"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-sm text-muted-foreground italic"
          quote={quote}
        />
        <div className="hero-scroll-rod" />
      </div>

      {/* ---------- 07 製圖師手記:方格野帳 + 羅盤 ---------- */}
      <div className="node-hero-variant node-hero-cartographer hero-cartographer-grid relative overflow-hidden rounded-none border-2 border-border">
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
        <HeroFrame
          outerClassName=""
          coverUrl={coverUrl}
          coverWrapperClassName="relative aspect-[16/5] w-full overflow-hidden"
          coverImgClassName="absolute inset-0 h-full w-full object-cover"
          avatarUrl={avatarUrl}
          avatarOverlapClassName="absolute -bottom-8 left-6 h-20 w-20 border-2 border-background object-cover shadow-sm"
          avatarInlineClassName="mb-3 h-16 w-16 border-2 border-border object-cover"
          bodyClassName="px-6 py-6"
          bodyWithOverlapClassName="px-6 pb-6 pt-12"
          name={name}
          nameClassName="font-display text-2xl font-bold uppercase sm:text-3xl"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-xs uppercase tracking-wide text-muted-foreground"
          quote={quote}
        />
      </div>

      {/* ---------- 08 占星曆書:星點夜色(星空背景只包文字區,封面橫幅
           邊到邊、不吃 hero-almanac-sky 自己的 padding) ---------- */}
      <div className="node-hero-variant node-hero-almanac overflow-hidden rounded-lg">
        {coverUrl && (
          <div className="relative aspect-[16/5] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <Avatar
              url={avatarUrl}
              className="absolute -bottom-8 left-6 h-20 w-20 rounded-full border-4 border-surface object-cover shadow-sm"
            />
          </div>
        )}
        <div
          className="hero-almanac-sky"
          style={coverUrl && avatarUrl ? { paddingTop: "3rem" } : undefined}
        >
          {!coverUrl && (
            <Avatar
              url={avatarUrl}
              className="mb-3 h-16 w-16 rounded-full border border-border object-cover"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold italic sm:text-3xl">{name}</h1>
            {typeBadge}
            {statusBadges}
          </div>
          <p className="hero-almanac-tagline">{metaLine}</p>
          {quote}
        </div>
      </div>
    </>
  );
}
