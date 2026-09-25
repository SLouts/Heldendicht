import * as z from "zod";

export type FieldValueMeta = {
  label: string;
  isRequired: boolean;
  fieldType: "text" | "select" | "range";
  options: string[];
  rangeMin: number | null;
  rangeMax: number | null;
  /** 'text' 類型選填時的長度上限,分類欄位(較長段落)跟角色欄位(單行事實)不一樣。 */
  maxLen?: number;
};

/**
 * 依欄位的類型/是否必填,組出對應這一格填答值的 zod schema——分類欄位跟
 * 角色必填欄位共用同一套規則,不重複寫兩份:
 * - 簡答(text):必填要非空,選填限字數上限。
 * - 下拉選單(select):必填要選到清單裡其中一個選項;選填可以留空,
 *   但選了就要是清單裡的選項——不信任表單自己夾帶的值,一律拿當下
 *   資料庫查到的 options 清單驗證。
 * - 橫條拉桿(range):滑桿本來就一定有值,不套用必填語意;只驗證數值
 *   落在 rangeMin/rangeMax 之間,防止有人繞過瀏覽器直接送出範圍外的值。
 */
export function buildFieldValueSchema(f: FieldValueMeta): z.ZodType<string> {
  if (f.fieldType === "select") {
    const validOptions = new Set(f.options);
    return z.string().refine(
      (v) => {
        const trimmed = v.trim();
        if (trimmed === "") return !f.isRequired;
        return validOptions.has(trimmed);
      },
      { error: f.isRequired ? `請選擇「${f.label}」` : `「${f.label}」的選項不正確` },
    );
  }

  if (f.fieldType === "range") {
    return z.string().refine(
      (v) => {
        if (v.trim() === "") return true;
        const num = Number(v);
        if (!Number.isFinite(num)) return false;
        if (f.rangeMin != null && num < f.rangeMin) return false;
        if (f.rangeMax != null && num > f.rangeMax) return false;
        return true;
      },
      { error: `「${f.label}」的數值超出範圍` },
    );
  }

  const maxLen = f.maxLen ?? 2000;
  return f.isRequired
    ? z.string().trim().min(1, { error: `請填寫「${f.label}」` })
    : z.string().trim().max(maxLen, { error: `「${f.label}」最多 ${maxLen} 字` });
}
