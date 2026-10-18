/**
 * 關係圖譜的版面配置(storymap-layout.ts,算節點間距)跟畫面渲染
 * (StoryMapGraph.tsx,決定標籤多大、縮放範圍)要用同一組假設,不然版面
 * 算出來的間距跟實際畫面上標籤的大小會對不上,縮小到某個程度標籤又會
 * 蓋住節點或互相疊字。
 *
 * STORYMAP_MIN_SCALE 身兼兩個角色:
 * 1. StoryMapGraph.tsx 縮放手勢(wheel/pinch)允許縮到的下限。
 * 2. 標籤反向放大補償「縮小維持可讀」的封頂比例——也是版面配置計算
 *    碰撞半徑時假設的「最壞情況」。
 * 兩者用同一個數字,保證「使用者實際縮得到的範圍內,標籤一定維持在
 * 版面配置當初保留的間距以內,不會重疊」這件事在整個縮放範圍內都成立,
 * 不是只在某個中繼縮放值才成立。
 */
export const STORYMAP_MIN_SCALE = 0.3;
export const STORYMAP_MAX_SCALE = 3;

export const STORYMAP_BASE_FONT_SIZE = 12;
export const STORYMAP_NODE_RADIUS = 12;
/** 標籤跟節點圓心的垂直間距(k=1 時),對應 StoryMapGraph.tsx 的 `y + 24`。 */
export const STORYMAP_LABEL_OFFSET_Y = 24;
/** 單行文字抓一個字體大小高,沒有精確量測(原因同下面 estimateLabelWidth)。 */
export const STORYMAP_LABEL_HEIGHT = STORYMAP_BASE_FONT_SIZE;

/**
 * 粗估文字在畫面上的寬度——全形字(中文/日文假名/全形標點)寬度接近
 * 字體大小本身,半形英數字大概六成寬。沒有實際量測文字(版面配置在
 * 伺服器端算,不能用 DOM/canvas API),只求抓一個夠安全的碰撞半徑用,
 * 不要求像素級準確。
 */
export function estimateLabelWidth(
  title: string,
  fontSize: number = STORYMAP_BASE_FONT_SIZE,
): number {
  let width = 0;
  for (const ch of title) {
    width += /[一-鿿　-〿＀-￯]/.test(ch) ? fontSize : fontSize * 0.6;
  }
  return width;
}

/**
 * 碰撞半徑——取「節點圓點半徑」和「一個圓心在節點上、剛好包住標籤矩形
 * 的圓」的半徑中較大的值。標籤矩形中心不在節點上(往下位移
 * STORYMAP_LABEL_OFFSET_Y),所以不能只用「標籤寬度的一半」當半徑,
 * 要算到矩形最遠角(左下/右下角)離節點中心的距離,才能保證整個標籤
 * 矩形都落在這個圓以內——兩個節點各自的圓不相交,兩邊的「節點+標籤」
 * 範圍就一定不會互相重疊(標籤對標籤、標籤對節點圓點都算在內)。
 *
 * 除以 STORYMAP_MIN_SCALE 是因為 StoryMapGraph.tsx 縮小到那個比例時
 * 標籤會放大補償到最大,畫面上的標籤不會比這裡假設的更大;要讓「不
 * 重疊」在使用者實際縮得到的整個範圍內都成立,必須用標籤「最大可能
 * 撐開到多大」的情境去抓間距,不能只算 k=1 的情況。
 */
export function collisionRadiusForTitle(title: string): number {
  const halfWidth = estimateLabelWidth(title) / 2;
  const farCornerDistance = Math.hypot(
    halfWidth,
    STORYMAP_LABEL_OFFSET_Y + STORYMAP_LABEL_HEIGHT,
  );
  return Math.max(STORYMAP_NODE_RADIUS, farCornerDistance / STORYMAP_MIN_SCALE);
}
