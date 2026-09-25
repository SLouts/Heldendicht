export type FieldTypeConfig = {
  fieldType: "text" | "select" | "range";
  options: string[];
  rangeMin: number | null;
  rangeMax: number | null;
  rangeStep: number | null;
};

export type ParseFieldTypeConfigResult = { error: string } | FieldTypeConfig;

const MAX_OPTION_LENGTH = 50;

/**
 * 解析後台欄位設定表單裡「欄位類型」那一段(對應 FieldTypeConfigFields
 * 元件送出的 fieldType/options/rangeMin/rangeMax/rangeStep)——分類欄位、
 * 角色必填欄位的 create/update Server Action 共用同一套解析規則。
 */
export function parseFieldTypeConfig(formData: FormData): ParseFieldTypeConfigResult {
  const rawFieldType = formData.get("fieldType");
  const fieldType =
    rawFieldType === "select" || rawFieldType === "range" ? rawFieldType : "text";

  if (fieldType === "select") {
    const raw = String(formData.get("options") ?? "");
    const options = [
      ...new Set(
        raw
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s !== ""),
      ),
    ];
    if (options.length < 2) {
      return { error: "下拉選單至少要有 2 個選項" };
    }
    if (options.some((o) => o.length > MAX_OPTION_LENGTH)) {
      return { error: `每個選項最多 ${MAX_OPTION_LENGTH} 字` };
    }
    return { fieldType, options, rangeMin: null, rangeMax: null, rangeStep: null };
  }

  if (fieldType === "range") {
    const min = Number(formData.get("rangeMin"));
    const max = Number(formData.get("rangeMax"));
    const step = Number(formData.get("rangeStep"));
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step)) {
      return { error: "橫條拉桿的數值設定不正確" };
    }
    if (min >= max) {
      return { error: "橫條拉桿的最小值必須小於最大值" };
    }
    if (step <= 0) {
      return { error: "橫條拉桿的間距必須大於 0" };
    }
    return { fieldType, options: [], rangeMin: min, rangeMax: max, rangeStep: step };
  }

  return { fieldType: "text", options: [], rangeMin: null, rangeMax: null, rangeStep: null };
}
