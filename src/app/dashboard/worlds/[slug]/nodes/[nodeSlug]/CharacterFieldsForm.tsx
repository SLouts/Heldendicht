"use client";

import { useState } from "react";
import { setCharacterFieldValues } from "@/lib/actions/characterFields";

export type CharacterFieldWithValue = { id: string; label: string; value: string };

export function CharacterFieldsForm({
  nodeId,
  worldSlug,
  fields,
}: {
  nodeId: string;
  worldSlug: string;
  fields: CharacterFieldWithValue[];
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
      const result = await setCharacterFieldValues(
        nodeId,
        worldSlug,
        fields.map((f) => ({ id: f.id, label: f.label })),
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
      className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-surface p-3"
    >
      <h3 className="text-sm font-semibold">角色基本資料(這個世界觀要求都要填)</h3>
      {fields.map((f) => (
        <div key={f.id} className="flex flex-col gap-1">
          <label htmlFor={`field_${f.id}`} className="text-sm font-medium">
            {f.label}
          </label>
          <input
            id={`field_${f.id}`}
            name={`field_${f.id}`}
            defaultValue={f.value}
            required
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
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

/** 沒有編輯權限時的唯讀顯示。compact 給節點側邊欄資訊卡這種窄欄用,
 * 固定單欄不強擠成 2/3 欄,避免標籤跟值在窄寬度下擠成兩行。 */
export function CharacterFieldsDisplay({
  fields,
  compact,
}: {
  fields: CharacterFieldWithValue[];
  compact?: boolean;
}) {
  // 沒填值的欄位整列都不顯示,不留空白列給人看到破折號。
  const filledFields = fields.filter((f) => f.value.trim() !== "");
  if (filledFields.length === 0) return null;

  return (
    <dl
      className={
        compact
          ? "mt-4 flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-sm"
          : "mt-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-border bg-surface p-3 text-sm sm:grid-cols-3"
      }
    >
      {filledFields.map((f) => (
        <div key={f.id} className="flex gap-1">
          <dt className="text-muted-foreground">{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
