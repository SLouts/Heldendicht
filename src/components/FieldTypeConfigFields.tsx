"use client";

import { useState } from "react";

const FIELD_TYPE_LABEL: Record<"text" | "select" | "range", string> = {
  text: "簡答(自由輸入文字)",
  select: "下拉選單",
  range: "橫條拉桿",
};

/**
 * 後台欄位設定表單裡「欄位類型」那一段——分類欄位、角色必填欄位的新增/
 * 編輯表單都共用這個元件。選「下拉選單」會多出一個選項清單輸入框,選
 * 「橫條拉桿」會多出最小值/最大值/間距三個數字輸入框,選「簡答」則什麼
 * 都不用填。用 name="fieldType"/"options"/"rangeMin"/"rangeMax"/"rangeStep"
 * 命名,對應的 Server Action 直接用這幾個 key 讀 FormData。
 */
export function FieldTypeConfigFields({
  idPrefix,
  defaultFieldType = "text",
  defaultOptions = [],
  defaultRangeMin,
  defaultRangeMax,
  defaultRangeStep,
}: {
  idPrefix: string;
  defaultFieldType?: "text" | "select" | "range";
  defaultOptions?: string[];
  defaultRangeMin?: number | null;
  defaultRangeMax?: number | null;
  defaultRangeStep?: number | null;
}) {
  const [fieldType, setFieldType] = useState<"text" | "select" | "range">(defaultFieldType);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-field-type`} className="text-sm font-medium">
          欄位類型
        </label>
        <select
          id={`${idPrefix}-field-type`}
          name="fieldType"
          value={fieldType}
          onChange={(e) => setFieldType(e.target.value as "text" | "select" | "range")}
          className="w-56 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        >
          <option value="text">{FIELD_TYPE_LABEL.text}</option>
          <option value="select">{FIELD_TYPE_LABEL.select}</option>
          <option value="range">{FIELD_TYPE_LABEL.range}</option>
        </select>
      </div>

      {fieldType === "select" && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-options`} className="text-sm font-medium">
            選項清單(一行一個,至少 2 個)
          </label>
          <textarea
            id={`${idPrefix}-options`}
            name="options"
            defaultValue={defaultOptions.join("\n")}
            rows={4}
            placeholder={"例如：\n男\n女\n其他"}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
      )}

      {fieldType === "range" && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-range-min`} className="text-xs text-muted-foreground">
              最小值
            </label>
            <input
              id={`${idPrefix}-range-min`}
              name="rangeMin"
              type="number"
              defaultValue={defaultRangeMin ?? 0}
              className="w-24 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-range-max`} className="text-xs text-muted-foreground">
              最大值
            </label>
            <input
              id={`${idPrefix}-range-max`}
              name="rangeMax"
              type="number"
              defaultValue={defaultRangeMax ?? 10}
              className="w-24 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-range-step`} className="text-xs text-muted-foreground">
              間距
            </label>
            <input
              id={`${idPrefix}-range-step`}
              name="rangeStep"
              type="number"
              defaultValue={defaultRangeStep ?? 1}
              className="w-24 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
