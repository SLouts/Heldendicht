/**
 * 關係圖譜的版面配置(storymap-layout.ts,算節點間距)跟畫面渲染
 * (StoryMapGraph.tsx,決定標籤多大、多小才不會再放大)要用同一組假設,
 * 不然版面算出來的間距跟實際畫面上標籤的大小會對不上,縮小到某個程度
 * 標籤又會蓋住節點或互相疊字——所以抽成共用常數,兩邊都從這裡拿。
 *
 * STORYMAP_MIN_LABEL_K:縮放比例 k 小於這個值以後,標籤字級/間距不再
 * 跟著繼續放大(StoryMapGraph.tsx 的 labelScale 封頂),版面配置也是
 * 用「縮到剛好這個比例」當最壞情況去抓碰撞半徑——兩邊用同一個數字,
 * 版面配置在這個比例以下才有「保證不重疊」的意義,再往下縮雖然標籤會
 * 跟著整體畫面一起變小(不再維持最小可讀字級),但相對間距的比例不變,
 * 不會變得比這個比例更擠。
 */
export const STORYMAP_BASE_FONT_SIZE = 12;
export const STORYMAP_NODE_RADIUS = 12;
export const STORYMAP_MIN_LABEL_K = 0.5;

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
