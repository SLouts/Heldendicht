/**
 * 節點頁面的「身分卡」——標題、狀態標籤、分類/擁有者、代表圖(一般節點
 * 是 image_path;角色節點另外多頭貼 avatarUrl,大圖用角色立繪
 * illustration_path),依美術方向切換版型。所有節點類型共用同一個元件,
 * 跟 WorldHero.tsx 同一個慣例:八份 <div> 都會渲染,實際顯示哪一份交給
 * globals.css 依 <html data-art-theme> 用 CSS 切換,不用另外寫 client
 * component 去讀 localStorage。
 *
 * characterType 為 null 代表不是角色節點——不顯示 PC/NPC 標籤,也不會有
 * avatarUrl(一般節點沒有頭貼欄位)。
 *
 * 頭貼/代表圖都是選填欄位,沒有上傳就不顯示對應區塊,不留空的佔位框
 * (跟世界觀首頁橫幅/Icon「不填就不顯示」同一套邏輯)。
 */
export function NodeIdentityCard({
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
  /** null = 不是角色節點,不顯示 PC/NPC 標籤。 */
  characterType: "pc" | "npc" | null;
  /** 狀態/佔位等其他標籤,樣式由呼叫端決定(跟原本標題列同一套 badge 慣例)。 */
  extraBadges?: React.ReactNode;
  nodeTypeLabel: string;
  categoryName: string | null;
  ownerLabel: string | null;
  /** 只有角色節點才有頭貼;一般節點一律傳 null。 */
  avatarUrl: string | null;
  /** 卡片內的代表圖——角色節點是立繪(illustration_path),一般節點是
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
      <div className="node-identity-variant node-identity-illuminated node-identity-illuminated-frame rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={avatarUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full border-2 border-border object-cover"
            />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold text-primary">{name}</h1>
              {typeBadge}
              {statusBadges}
            </div>
            <p className="mt-1 text-sm text-muted-foreground italic">{metaLine}</p>
          </div>
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            src={imageUrl}
            alt=""
            className="mt-4 max-h-96 w-full rounded border border-border object-cover"
          />
        )}
      </div>

      {/* ---------- 02 劇本手稿:標題頁 ---------- */}
      <div className="node-identity-variant node-identity-script border border-border bg-surface">
        <div className="node-identity-script-masthead">
          {characterType ? "Character Sheet" : "Field Record"}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-4">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
              <img
                src={avatarUrl}
                alt=""
                className="h-14 w-14 shrink-0 border border-border object-cover"
              />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold uppercase">{name}</h1>
                {typeBadge}
                {statusBadges}
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {metaLine}
              </p>
            </div>
          </div>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={imageUrl}
              alt=""
              className="mt-4 max-h-96 w-full border border-border object-cover"
            />
          )}
        </div>
      </div>

      {/* ---------- 03 田野筆記:點格紙 ---------- */}
      <div className="node-identity-variant node-identity-field hero-field-dots rounded-lg border border-border p-5">
        <div className="flex items-center gap-4">
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={avatarUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
            />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl">{name}</h1>
              {typeBadge}
              {statusBadges}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{metaLine}</p>
          </div>
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            src={imageUrl}
            alt=""
            className="mt-4 max-h-96 w-full -rotate-1 rounded border border-border object-cover"
          />
        )}
      </div>

      {/* ---------- 04 角色卡牌:卡框 ---------- */}
      <div className="node-identity-variant node-identity-card">
        <div className="hero-card-frame">
          <div className="flex items-center gap-3 px-2 pt-1.5 pb-2.5">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
              <img
                src={avatarUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border border-[#b6912f] object-cover"
              />
            )}
            <b className="font-display flex-grow text-xl uppercase tracking-wide">{name}</b>
          </div>
          {imageUrl && (
            <div className="hero-card-art">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
              <img src={imageUrl} alt="" />
            </div>
          )}
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
      <div className="node-identity-variant node-identity-wuxia rounded-none border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img src={avatarUrl} alt="" className="hero-wuxia-seal rounded-full object-cover" />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold">{name}</h1>
              {typeBadge}
              {statusBadges}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{metaLine}</p>
          </div>
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            src={imageUrl}
            alt=""
            className="mt-4 max-h-96 w-full object-cover"
          />
        )}
      </div>

      {/* ---------- 06 羊皮紙卷軸:攤開的卷軸 ---------- */}
      <div className="node-identity-variant node-identity-scroll">
        <div className="hero-scroll-rod" />
        <div className="bg-surface px-5 py-6 text-center">
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={avatarUrl}
              alt=""
              className="mx-auto h-14 w-14 rounded-full border border-border object-cover"
            />
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <h1 className="font-display text-2xl">{name}</h1>
            {typeBadge}
            {statusBadges}
          </div>
          <p className="mt-1 text-sm text-muted-foreground italic">{metaLine}</p>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={imageUrl}
              alt=""
              className="mx-auto mt-4 max-h-96 w-full max-w-xs rounded border border-border object-cover"
            />
          )}
        </div>
        <div className="hero-scroll-rod" />
      </div>

      {/* ---------- 07 製圖師手記:方格野帳 + 羅盤 ---------- */}
      <div className="node-identity-variant node-identity-cartographer hero-cartographer-grid relative rounded-none border-2 border-border p-5">
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
        <div className="flex items-center gap-4">
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={avatarUrl}
              alt=""
              className="h-14 w-14 shrink-0 border-2 border-border object-cover"
            />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold uppercase">{name}</h1>
              {typeBadge}
              {statusBadges}
            </div>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              {metaLine}
            </p>
          </div>
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            src={imageUrl}
            alt=""
            className="mt-4 max-h-96 w-full border-2 border-border object-cover"
          />
        )}
      </div>

      {/* ---------- 08 占星曆書:星點夜色 ---------- */}
      <div className="node-identity-variant node-identity-almanac">
        <div className="hero-almanac-sky">
          {avatarUrl && (
            <div className="hero-almanac-row">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
              <img
                src={avatarUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold italic">{name}</h1>
                  {typeBadge}
                </div>
                <p className="hero-almanac-tagline">{metaLine}</p>
              </div>
            </div>
          )}
          {!avatarUrl && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold italic">{name}</h1>
                {typeBadge}
              </div>
              <p className="hero-almanac-tagline">{metaLine}</p>
            </>
          )}
          {statusBadges && <div className="mt-2 flex flex-wrap gap-2">{statusBadges}</div>}
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            src={imageUrl}
            alt=""
            className="mt-4 max-h-96 w-full rounded border border-border object-cover"
          />
        )}
      </div>
    </>
  );
}
