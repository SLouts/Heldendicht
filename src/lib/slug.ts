import "server-only";
import { pinyin } from "pinyin-pro";

/**
 * 節點/角色的 slug 不再讓使用者自訂——標題常常是中文,硬要使用者自己
 * 想一個只能用小寫英數字與連字號的網址代號並不好用。這裡改成自動產生:
 * 先把標題轉成拼音(中文字以外的部分原樣保留,例如「回春丹beta」轉成
 * 「hui chun dan beta」),再擷取英數字部分當前綴,擷取不到(轉完還是空字串,
 * 例如整段都是生僻字沒有拼音)就整個交給隨機字串,一律再加一段隨機尾碼
 * 降低跟其他節點撞號的機率。真的撞號時交給呼叫端重試(nodes 表的
 * unique(world_id, slug) 約束是最後一道防線)。
 *
 * 舊版沒有轉拼音,純中文標題擷取不到任何英數字,slug 會整個退化成隨機
 * 字串,完全看不出對應哪個標題(也是「daodan-xxxx」這類舊資料的由來)。
 */
// 日文新字體跟中文簡/繁字長得一樣或很像,但中文拼音字典是照中文本身的
// 讀音查,查到的常常是完全不相干的罕見中文字——例如「豊」是「豐」的
// 日文新字體,中文拼音字典卻把它當成唸 lǐ 的古代禮器用字。只先處理
// 實際回報過的案例,不是做一套完整的日文漢字正規化表。
const JAPANESE_KANJI_SUBSTITUTIONS: Record<string, string> = {
  "豊": "豐",
};

function normalizeJapaneseKanji(title: string): string {
  return [...title]
    .map((ch) => JAPANESE_KANJI_SUBSTITUTIONS[ch] ?? ch)
    .join("");
}

export function generateNodeSlug(title: string): string {
  const romanized = pinyin(normalizeJapaneseKanji(title), {
    toneType: "none",
    type: "string",
    nonZh: "consecutive",
  });
  const asciiPart = romanized
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return asciiPart ? `${asciiPart}-${suffix}` : suffix;
}
