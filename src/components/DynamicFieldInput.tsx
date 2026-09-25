"use client";

import { useState } from "react";

/**
 * 依欄位類型(簡答/下拉選單/橫條拉桿)渲染對應的輸入元件——分類欄位跟
 * 角色必填欄位共用同一套類型定義,建立/編輯表單都靠這個元件決定要出現
 * 哪種輸入,不用在每個表單各自重複判斷一次。
 */
export function DynamicFieldInput({
  id,
  name,
  defaultValue,
  required,
  fieldType,
  options,
  rangeMin,
  rangeMax,
  rangeStep,
  multiline,
}: {
  id: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  fieldType: "text" | "select" | "range";
  options: string[];
  rangeMin: number | null;
  rangeMax: number | null;
  rangeStep: number | null;
  /** 'text' 類型底下用 textarea(分類欄位,內容通常較長)還是 input(角色欄位,單行事實)。 */
  multiline?: boolean;
}) {
  if (fieldType === "select") {
    return (
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
      >
        <option value="" disabled={required}>
          請選擇
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (fieldType === "range") {
    return (
      <RangeInputWithValue
        id={id}
        name={name}
        defaultValue={defaultValue}
        min={rangeMin ?? 0}
        max={rangeMax ?? 10}
        step={rangeStep ?? 1}
      />
    );
  }

  return multiline ? (
    <textarea
      id={id}
      name={name}
      defaultValue={defaultValue}
      required={required}
      rows={3}
      className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
    />
  ) : (
    <input
      id={id}
      name={name}
      defaultValue={defaultValue}
      required={required}
      className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
    />
  );
}

/** 原生 range input 本身不會顯示目前拉到哪個數值,額外用一個 state 存目前值,
 * 旁邊即時顯示出來,不然玩家拉的時候完全看不到自己選了多少。 */
function RangeInputWithValue({
  id,
  name,
  defaultValue,
  min,
  max,
  step,
}: {
  id: string;
  name: string;
  defaultValue: string;
  min: number;
  max: number;
  step: number;
}) {
  const parsedDefault = Number(defaultValue);
  const initial = defaultValue !== "" && !Number.isNaN(parsedDefault) ? parsedDefault : min;
  const [value, setValue] = useState(initial);

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        id={id}
        name={name}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="flex-1"
      />
      <span className="w-14 text-right text-sm tabular-nums">{value}</span>
    </div>
  );
}
