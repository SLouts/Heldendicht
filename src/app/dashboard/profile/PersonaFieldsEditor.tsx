"use client";

import { useState } from "react";
import type { PersonaField } from "@/lib/actions/personas";

/**
 * 角色跨世界觀通用的基本資料欄位(性別/生日/種族之類),不同企劃需要的
 * 欄位差很多,所以做成玩家自己輸入 label/value 的自訂列表,而不是固定
 * 欄位——序列化成 JSON 塞進一個隱藏 input,交給 Server Action 解析。
 */
export function PersonaFieldsEditor({
  initialFields,
}: {
  initialFields: PersonaField[];
}) {
  const [fields, setFields] = useState<PersonaField[]>(initialFields);

  const serialized = JSON.stringify(
    fields.filter((f) => f.label.trim() && f.value.trim()),
  );

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="fields" value={serialized} />
      <span className="text-sm font-medium">基本資料</span>
      {fields.map((f, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={f.label}
            onChange={(e) =>
              setFields((prev) =>
                prev.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)),
              )
            }
            placeholder="欄位,例如「性別」"
            className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-sm"
          />
          <input
            value={f.value}
            onChange={(e) =>
              setFields((prev) =>
                prev.map((p, j) => (j === i ? { ...p, value: e.target.value } : p)),
              )
            }
            placeholder="內容"
            className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => setFields((prev) => prev.filter((_, j) => j !== i))}
            className="text-xs text-danger underline"
          >
            移除
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setFields((prev) => [...prev, { label: "", value: "" }])}
        className="w-fit text-xs underline"
      >
        + 新增欄位
      </button>
    </div>
  );
}
