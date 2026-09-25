"use client";

import { useState } from "react";
import { setCategoryFieldValues } from "@/lib/actions/categoryFields";
import { DynamicFieldInput } from "@/components/DynamicFieldInput";

export type CategoryFieldWithValue = {
  id: string;
  label: string;
  value: string;
  isRequired: boolean;
  fieldType: "text" | "select" | "range";
  options: string[];
  rangeMin: number | null;
  rangeMax: number | null;
  rangeStep: number | null;
};

/**
 * 分類欄位的簡答內容通常比角色欄位長(段落式說明,不是「性別」這種單行
 * 事實),所以簡答類型用 textarea 逐欄位編輯、區塊式顯示,不像
 * CharacterFieldsForm 那樣用單行 input + dl 兩三欄並排。下拉選單/橫條
 * 拉桿兩種類型的輸入元件是共用的(DynamicFieldInput),跟角色欄位一致。
 */
export function CategoryFieldsForm({
  nodeId,
  worldSlug,
  fields,
}: {
  nodeId: string;
  worldSlug: string;
  fields: CategoryFieldWithValue[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (fields.length === 0) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const values: Record<string, string> = {};
      for (const f of fields) {
        values[f.id] = String(formData.get(`field_${f.id}`) ?? "");
      }
      const result = await setCategoryFieldValues(
        nodeId,
        worldSlug,
        fields.map((f) => ({
          id: f.id,
          label: f.label,
          isRequired: f.isRequired,
          fieldType: f.fieldType,
          options: f.options,
          rangeMin: f.rangeMin,
          rangeMax: f.rangeMax,
        })),
        values,
      );
      if ("error" in result) {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-surface p-3"
    >
      <h3 className="text-sm font-semibold">這個分類的欄位</h3>
      {fields.map((f) => (
        <div key={f.id} className="flex flex-col gap-1">
          <label htmlFor={`field_${f.id}`} className="text-sm font-medium">
            {f.label}
            {f.isRequired ? (
              <span className="ml-1 text-danger">*</span>
            ) : (
              <span className="ml-1 text-xs font-normal text-muted-foreground">(選填)</span>
            )}
          </label>
          <DynamicFieldInput
            id={`field_${f.id}`}
            name={`field_${f.id}`}
            defaultValue={f.value}
            required={f.isRequired}
            fieldType={f.fieldType}
            options={f.options}
            rangeMin={f.rangeMin}
            rangeMax={f.rangeMax}
            rangeStep={f.rangeStep}
            multiline
          />
        </div>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "儲存中…" : "儲存"}
      </button>
    </form>
  );
}

/** 沒有編輯權限時的唯讀顯示——區塊式(標題+整段內容),不是 dl 短欄位。
 * 沒填值的選填欄位整塊都不顯示,不留空白區塊給人看到破折號。 */
export function CategoryFieldsDisplay({ fields }: { fields: CategoryFieldWithValue[] }) {
  const filledFields = fields.filter((f) => f.value.trim() !== "");
  if (filledFields.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-4">
      {filledFields.map((f) => (
        <div key={f.id}>
          <h3 className="text-sm font-semibold">{f.label}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{f.value}</p>
        </div>
      ))}
    </div>
  );
}
