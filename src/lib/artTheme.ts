/**
 * 八種美術方向(對應紋章三稿~五稿的提案),讓訪客自己選,存在瀏覽器
 * localStorage——只是顯示偏好,不是帳號設定,不需要登入也能切換。
 */
export const ART_THEMES = [
  { id: "illuminated", label: "泥金手抄本" },
  { id: "script", label: "劇本手稿" },
  { id: "field", label: "田野筆記" },
  { id: "card", label: "角色卡牌" },
  { id: "wuxia", label: "東方玄幻" },
  { id: "scroll", label: "羊皮紙卷軸" },
  { id: "cartographer", label: "製圖師手記" },
  { id: "almanac", label: "占星曆書" },
] as const;

export type ArtTheme = (typeof ART_THEMES)[number]["id"];

export const ART_THEME_IDS = ART_THEMES.map((t) => t.id) as ArtTheme[];

export const ART_THEME_STORAGE_KEY = "heldendicht-art-theme";

export const ART_THEME_ATTR = "data-art-theme";
