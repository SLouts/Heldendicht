/**
 * 節點頁面的「身分卡」——標題、狀態標籤、分類/擁有者、頭貼/封面橫幅、
 * 立繪或代表圖,依美術方向切換版型。所有節點類型共用同一個元件,跟
 * WorldHero.tsx 同一個慣例:八份 <div> 都會渲染,實際顯示哪一份交給
 * globals.css 依 <html data-art-theme> 用 CSS 切換,不用另外寫 client
 * component 去讀 localStorage。
 *
 * characterType 為 null 代表不是角色節點——不顯示 PC/NPC 標籤,也不會有
 * avatarUrl/coverUrl(一般節點沒有頭貼/封面欄位,只有 imageUrl 代表圖,
 * 直接當大圖顯示,跟角色立繪同一個位置)。
 *
 * 角色節點有三張圖,各自用途不同:avatarUrl(頭貼)+coverUrl(封面/
 * 代表圖)並排組成頂端橫幅;imageUrl(立繪)在橫幅下面單獨、完整顯示
 * (不裁切)。頭貼/封面/立繪都是選填欄位,沒有上傳就不顯示對應區塊,
 * 不留空的佔位框(跟世界觀首頁橫幅/Icon「不填就不顯示」同一套邏輯)。
 *
 * 七個版型(除了卡牌)結構其實一樣——橫幅、標題、標籤、meta、立繪由上
 * 到下堆疊,抽成下面的 Banner/IdentityStack 共用,各版型只傳各自的
 * className;真正需要獨立 DOM 的裝飾(劇本手稿的標題列、製圖師的羅盤、
 * 卷軸的滾棒、卡牌的分層卡框)才留在各自版型裡手寫。
 *
 * 立繪/代表圖故意不裁切(只給 w-full,不設 max-height/object-cover)——
 * 完整呈現原圖比例,避免直式插畫的手腳被硬裁掉。頭貼/封面是小尺寸的
 * 橫幅預覽,裁切是預期中的行為,維持 object-cover。
 *
 * 這是手機/窄螢幕版。PC 寬螢幕版是另一個元件 NodeIdentityCardDesktop.tsx,
 * 兩邊各自渲染、用 lg: 斷點切換顯示,結構(Banner/IdentityStack)已經
 * 共用,差異只剩頭貼/封面尺寸跟版型細節的 className。
 */

/** 跟 NodeIdentityCardDesktop.tsx 共用——頭貼/大圖的渲染規則(選填、
 * 沒有就不顯示)完全一樣。 */
export function Avatar({ url, className }: { url: string | null; className: string }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
  return <img src={url} alt="" className={className} />;
}

export function BigImage({
  url,
  className,
  wrapperClassName,
}: {
  url: string | null;
  className?: string;
  wrapperClassName?: string;
}) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
  const img = <img src={url} alt="" className={className} />;
  return wrapperClassName ? <div className={wrapperClassName}>{img}</div> : img;
}

/** 跟 NodeIdentityCardDesktop.tsx 共用——標題最上方的「頭貼+封面」橫幅。
 * 兩張都選填:都有就頭貼在左、封面撐滿右側;只有一張就那張自己置中;
 * 兩張都沒有就整個橫幅不渲染,不留空的佔位框。 */
export function Banner({
  avatarUrl,
  avatarClassName,
  coverUrl,
  coverClassName,
  wrapperClassName,
}: {
  avatarUrl: string | null;
  avatarClassName: string;
  coverUrl: string | null;
  coverClassName: string;
  wrapperClassName: string;
}) {
  if (!avatarUrl && !coverUrl) return null;
  return (
    <div className={wrapperClassName}>
      <Avatar url={avatarUrl} className={avatarClassName} />
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
        <img src={coverUrl} alt="" className={coverClassName} />
      )}
    </div>
  );
}

/** 跟 NodeIdentityCardDesktop.tsx 共用——七個版型(除了卡牌)結構相同的
 * 「橫幅、標題、標籤、meta、立繪/代表圖」堆疊,呼叫端只傳各自版型的
 * className。 */
export function IdentityStack({
  avatarUrl,
  avatarClassName,
  coverUrl,
  coverClassName,
  bannerClassName,
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
  coverUrl: string | null;
  coverClassName: string;
  bannerClassName: string;
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
      <Banner
        avatarUrl={avatarUrl}
        avatarClassName={avatarClassName}
        coverUrl={coverUrl}
        coverClassName={coverClassName}
        wrapperClassName={bannerClassName}
      />
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

export function NodeIdentityCard({
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
  /** null = 不是角色節點,不顯示 PC/NPC 標籤。 */
  characterType: "pc" | "npc" | null;
  /** 狀態/佔位等其他標籤,樣式由呼叫端決定(跟原本標題列同一套 badge 慣例)。 */
  extraBadges?: React.ReactNode;
  nodeTypeLabel: string;
  categoryName: string | null;
  ownerLabel: string | null;
  /** 只有角色節點才有頭貼;一般節點一律傳 null。 */
  avatarUrl: string | null;
  /** 封面/代表圖(image_path)——只有角色節點會在橫幅裡跟頭貼並排顯示;
   * 一般節點一律傳 null(它的代表圖直接走 imageUrl 當大圖)。 */
  coverUrl: string | null;
  /** 卡片下方的大圖——角色節點是立繪(illustration_path),一般節點是
   * 代表圖(image_path)。 */
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
      {/* ---------- 01 泥金手抄本(預設) ---------- */}
      <div className="node-identity-variant node-identity-illuminated node-identity-illuminated-frame rounded-lg border border-border bg-surface p-5 text-center">
        <IdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="h-20 w-20 shrink-0 rounded-full border-2 border-border object-cover"
          coverUrl={coverUrl}
          coverClassName="h-20 flex-1 rounded border border-border object-cover"
          bannerClassName="flex items-center justify-center gap-3"
          name={name}
          nameClassName="font-display mt-3 text-2xl font-semibold text-primary"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-sm text-muted-foreground italic"
          imageUrl={imageUrl}
          imageClassName="mt-4 w-full rounded border border-border"
        />
      </div>

      {/* ---------- 02 劇本手稿:標題頁 ---------- */}
      <div className="node-identity-variant node-identity-script border border-border bg-surface">
        <div className="node-identity-script-masthead">
          {characterType ? "Character Sheet" : "Field Record"}
        </div>
        <div className="p-4 text-center">
          <IdentityStack
            avatarUrl={avatarUrl}
            avatarClassName="h-20 w-20 shrink-0 border border-border object-cover"
            coverUrl={coverUrl}
            coverClassName="h-20 flex-1 border border-border object-cover"
            bannerClassName="flex items-center justify-center gap-3"
            name={name}
            nameClassName="font-display mt-3 text-2xl font-semibold uppercase"
            typeBadge={typeBadge}
            statusBadges={statusBadges}
            metaLine={metaLine}
            metaClassName="mt-1 text-xs uppercase tracking-wide text-muted-foreground"
            imageUrl={imageUrl}
            imageClassName="mt-4 w-full border border-border"
          />
        </div>
      </div>

      {/* ---------- 03 田野筆記:點格紙 ---------- */}
      <div className="node-identity-variant node-identity-field hero-field-dots rounded-lg border border-border p-5 text-center">
        <IdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
          coverUrl={coverUrl}
          coverClassName="h-20 flex-1 rounded border border-border object-cover"
          bannerClassName="flex items-center justify-center gap-3"
          name={name}
          nameClassName="font-display mt-3 text-2xl"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-sm text-muted-foreground"
          imageUrl={imageUrl}
          imageClassName="mt-4 w-full rounded border border-border"
        />
      </div>

      {/* ---------- 04 角色卡牌:卡框(結構跟其他版型差太多,維持獨立手寫;
           沒有橫幅,封面暫不顯示) ---------- */}
      <div className="node-identity-variant node-identity-card">
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
      <div className="node-identity-variant node-identity-wuxia rounded-none border border-border bg-surface p-5 text-center">
        <IdentityStack
          avatarUrl={avatarUrl}
          avatarClassName="hero-wuxia-seal rounded-full object-cover"
          coverUrl={coverUrl}
          coverClassName="h-11 flex-1 object-cover"
          bannerClassName="flex items-center justify-center gap-3"
          name={name}
          nameClassName="font-display mt-3 text-2xl font-semibold"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-sm text-muted-foreground"
          imageUrl={imageUrl}
          imageClassName="mt-4 w-full"
        />
      </div>

      {/* ---------- 06 羊皮紙卷軸:攤開的卷軸 ---------- */}
      <div className="node-identity-variant node-identity-scroll">
        <div className="hero-scroll-rod" />
        <div className="bg-surface px-5 py-6 text-center">
          <IdentityStack
            avatarUrl={avatarUrl}
            avatarClassName="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
            coverUrl={coverUrl}
            coverClassName="h-20 flex-1 rounded border border-border object-cover"
            bannerClassName="mx-auto flex max-w-xs items-center justify-center gap-3"
            name={name}
            nameClassName="font-display mt-3 text-2xl"
            typeBadge={typeBadge}
            statusBadges={statusBadges}
            metaLine={metaLine}
            metaClassName="mt-1 text-sm text-muted-foreground italic"
            imageUrl={imageUrl}
            imageClassName="mx-auto mt-4 w-full max-w-xs rounded border border-border"
          />
        </div>
        <div className="hero-scroll-rod" />
      </div>

      {/* ---------- 07 製圖師手記:方格野帳 + 羅盤 ---------- */}
      <div className="node-identity-variant node-identity-cartographer hero-cartographer-grid relative rounded-none border-2 border-border p-5 text-center">
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
          avatarClassName="h-20 w-20 shrink-0 border-2 border-border object-cover"
          coverUrl={coverUrl}
          coverClassName="h-20 flex-1 border-2 border-border object-cover"
          bannerClassName="flex items-center justify-center gap-3"
          name={name}
          nameClassName="font-display mt-3 text-2xl font-bold uppercase"
          typeBadge={typeBadge}
          statusBadges={statusBadges}
          metaLine={metaLine}
          metaClassName="mt-1 text-xs uppercase tracking-wide text-muted-foreground"
          imageUrl={imageUrl}
          imageClassName="mt-4 w-full border-2 border-border"
        />
      </div>

      {/* ---------- 08 占星曆書:星點夜色 ---------- */}
      <div className="node-identity-variant node-identity-almanac">
        <div className="hero-almanac-sky text-center">
          <IdentityStack
            avatarUrl={avatarUrl}
            avatarClassName="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
            coverUrl={coverUrl}
            coverClassName="h-20 flex-1 rounded border border-border object-cover"
            bannerClassName="flex items-center justify-center gap-3"
            name={name}
            nameClassName="font-display mt-3 text-2xl font-semibold italic"
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
