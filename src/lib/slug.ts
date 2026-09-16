import "server-only";

/**
 * 節點/角色的 slug 不再讓使用者自訂——標題常常是中文,硬要使用者自己
 * 想一個只能用小寫英數字與連字號的網址代號並不好用。這裡改成自動產生:
 * 能從標題擷取出英數字的部分就當前綴(方便偶爾是英文標題時網址還算好讀),
 * 擷取不到(例如純中文標題)就整個交給隨機字串,一律再加一段隨機尾碼
 * 降低跟其他節點撞號的機率。真的撞號時交給呼叫端重試(nodes 表的
 * unique(world_id, slug) 約束是最後一道防線)。
 */
export function generateNodeSlug(title: string): string {
  const asciiPart = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return asciiPart ? `${asciiPart}-${suffix}` : suffix;
}
