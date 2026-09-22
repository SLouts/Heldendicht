/**
 * 把世界觀的「角色必填欄位」+「補充區塊範本」的範例值組成一份純文字
 * 範本,給前台複製按鈕用。格式刻意跟 parseCharacterImportText(貼上文字
 * 自動匯入的解析規則)完全對齊——每個欄位一行「標籤：範例值」,每個
 * 章節先獨立一行放標題,下一行開始放範例內容,章節之間空一行分隔。
 * 玩家複製這份範本、把範例值改成自己的設定、貼回「貼上文字匯入」,
 * 系統會照原本的規則正確拆解回欄位+章節,不需要另一套格式。
 *
 * 純函式(沒有 I/O),前後台都能直接呼叫同一份邏輯。
 */
export function buildCharacterTemplateText(
  fields: { label: string; exampleValue: string }[],
  sections: { label: string; exampleContent: string }[],
): string {
  // 欄位彼此緊貼(一行一個,不空行),章節各自成一個區塊——區塊跟區塊
  // 之間才空一行分隔,不是每一行都空行。
  const fieldBlock = fields.map((f) => `${f.label}：${f.exampleValue}`).join("\n");
  const sectionBlocks = sections.map(
    (s) => `${s.label}\n${s.exampleContent || "(尚未填寫範例)"}`,
  );

  return [fieldBlock, ...sectionBlocks].filter((block) => block.trim() !== "").join("\n\n");
}
