/**
 * 「貼上文字自動匯入角色設定」的純規則解析——完全是字串/正則比對,
 * 不呼叫任何 AI/LLM,不送去任何外部服務,跟搜尋功能「不接第三方 AI」
 * 同一個原則。因為是純函式(沒有 I/O),伺服器端(Server Action 裡做
 * 真正寫入前的解析)、客戶端(表單裡即時預覽解析結果)都能直接呼叫
 * 同一份邏輯,不用維護兩份規則。
 *
 * 規則(依序套用,每一行只會落進其中一類):
 * 1. 這一行整行(去除頭尾空白後)剛好等於世界觀「補充區塊範本」裡的某個
 *    標題 → 開始一個新的補充區塊,後面的行都歸進去,直到下一個對到範本
 *    的標題或文字結束。
 * 2. 這一行以 `YYYY.MM` 或 `YYYY.MM.DD` 開頭(不管是否在補充區塊裡面)
 *    → 整行拉出來變成一筆生平時間線(label=日期,description=日期後面
 *    的文字),不會留在主文或補充區塊裡。
 * 3. 還沒進入任何補充區塊時,這一行是「標籤：值」的格式,且標籤剛好對到
 *    世界觀「角色必填欄位」的某個欄位名稱 → 記一筆欄位值,同時這一行
 *    還是照樣保留在主文裡(欄位卡片是額外萃取出來的結構化資料,主文
 *    維持完整可讀,不因為被辨識成欄位就從主文消失)。
 * 4. 其餘的行:還沒進入任何補充區塊時進主文,已經在某個補充區塊裡時
 *    進該區塊的內容。
 */

export type ParsedCharacterImport = {
  mainContent: string;
  fieldValues: { label: string; value: string }[];
  sections: { title: string; content: string }[];
  timelineEvents: { label: string; description: string }[];
};

// 日期開頭的行,例如「1914.03.01-生於皇城」「1932.06 離家出走」
// 「1926.10.26 初次試驗，被打斷」。年月日之間用半形句點分隔,
// 日期後面可以接半形/全形冒號、破折號或空白,再接描述文字。
const DATE_LINE = /^(\d{4}\.\d{1,2}(?:\.\d{1,2})?)[\s.\-－—]*[:：]?\s*(.+)$/;

// 「標籤：值」的行,標籤不含空白跟冒號本身,長度限制避免誤判整段敘述文字。
const FIELD_LINE = /^([^\s：:]{1,20})[：:]\s*(.*)$/;

export function parseCharacterImportText(
  rawText: string,
  characterFieldLabels: string[],
  sectionTemplateLabels: string[],
): ParsedCharacterImport {
  const lines = rawText.split(/\r?\n/);
  const fieldValues: { label: string; value: string }[] = [];
  const sections: { title: string; content: string }[] = [];
  const timelineEvents: { label: string; description: string }[] = [];
  const mainLines: string[] = [];

  const fieldLabelSet = new Set(characterFieldLabels);
  const sectionLabelSet = new Set(
    sectionTemplateLabels.filter((label) => label.trim() !== ""),
  );

  let currentSection: { title: string; lines: string[] } | null = null;

  function flushSection() {
    if (currentSection) {
      sections.push({
        title: currentSection.title,
        content: currentSection.lines.join("\n").trim(),
      });
      currentSection = null;
    }
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (sectionLabelSet.has(trimmed)) {
      flushSection();
      currentSection = { title: trimmed, lines: [] };
      continue;
    }

    const dateMatch = trimmed.match(DATE_LINE);
    if (dateMatch) {
      timelineEvents.push({ label: dateMatch[1], description: dateMatch[2].trim() });
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(rawLine);
      continue;
    }

    const fieldMatch = trimmed.match(FIELD_LINE);
    if (fieldMatch && fieldLabelSet.has(fieldMatch[1])) {
      fieldValues.push({ label: fieldMatch[1], value: fieldMatch[2].trim() });
      mainLines.push(rawLine);
      continue;
    }

    mainLines.push(rawLine);
  }
  flushSection();

  return {
    mainContent: mainLines.join("\n").trim(),
    fieldValues,
    sections,
    timelineEvents,
  };
}
