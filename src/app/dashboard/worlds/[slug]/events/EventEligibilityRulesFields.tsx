"use client";

import { Fragment, useState } from "react";

export type FieldOption = {
  id: string;
  label: string;
  field_type: "text" | "select" | "range";
  options: string[];
};

/** 一組條件=一個欄位+這個欄位可以接受的值清單(符合其中一個就算過)。 */
export type FieldRuleGroup = { fieldId: string; requiredValues: string[] };

/**
 * 報名資格條件的動態欄位列——新增/編輯公告表單共用。同一個欄位底下可以
 * 勾選/新增多個可接受的值(欄位內是 OR),不同欄位之間要全部符合(欄位間
 * 是 AND),對應 guard_event_entry_insert() trigger 的分組判斷邏輯。
 *
 * 送出時攤平成同長度的 name="ruleFieldId"/"ruleValue" 兩組陣列(同一個
 * group 的每個值各自配一個 ruleFieldId),actions/events.ts 依索引配對,
 * 不需要因為這裡改成分組 UI 而修改後端的解析邏輯。
 */
export function EventEligibilityRulesFields({
  fields,
  rules,
  onChange,
}: {
  fields: FieldOption[];
  rules: FieldRuleGroup[];
  onChange: (rules: FieldRuleGroup[]) => void;
}) {
  function addGroup() {
    const usedFieldIds = new Set(rules.map((r) => r.fieldId));
    const nextField = fields.find((f) => !usedFieldIds.has(f.id)) ?? fields[0];
    onChange([...rules, { fieldId: nextField?.id ?? "", requiredValues: [] }]);
  }
  function removeGroup(index: number) {
    onChange(rules.filter((_, i) => i !== index));
  }
  function updateGroup(index: number, patch: Partial<FieldRuleGroup>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-sm font-medium">
        報名資格條件(選填,不同欄位要全部符合;同一個欄位內符合任一個值即可)
      </p>
      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground">沒有條件代表所有 PC 都能報名。</p>
      )}
      {rules.map((group, i) => {
        const field = fields.find((f) => f.id === group.fieldId);
        return (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-2">
            <div className="flex items-center gap-2">
              <select
                value={group.fieldId}
                onChange={(e) => updateGroup(i, { fieldId: e.target.value, requiredValues: [] })}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeGroup(i)}
                className="text-sm text-danger underline"
              >
                移除這個條件
              </button>
            </div>

            {field?.field_type === "select" ? (
              <div className="flex flex-wrap gap-3">
                {field.options.map((o) => {
                  const checked = group.requiredValues.includes(o);
                  return (
                    <label key={o} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...group.requiredValues, o]
                            : group.requiredValues.filter((v) => v !== o);
                          updateGroup(i, { requiredValues: next });
                        }}
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            ) : (
              <EligibilityTextValues
                values={group.requiredValues}
                onChange={(next) => updateGroup(i, { requiredValues: next })}
              />
            )}

            {group.requiredValues.length === 0 && (
              <p className="text-xs text-muted-foreground">
                還沒選任何值,這個條件暫時不會限制任何人。
              </p>
            )}

            {group.requiredValues.map((v, vi) => (
              <Fragment key={vi}>
                <input type="hidden" name="ruleFieldId" value={group.fieldId} />
                <input type="hidden" name="ruleValue" value={v} />
              </Fragment>
            ))}
          </div>
        );
      })}
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          這個世界觀還沒有設定角色必填欄位,沒辦法加報名資格條件。
        </p>
      ) : (
        <button type="button" onClick={addGroup} className="w-fit text-sm underline">
          + 新增條件
        </button>
      )}
    </div>
  );
}

/** 文字/橫條拉桿欄位沒有固定選項,用「輸入後加入」的標籤清單做多選。 */
function EligibilityTextValues({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addValue() {
    const trimmed = draft.trim();
    if (trimmed === "" || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1 rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`移除「${v}」`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder="輸入一個符合的值,按 Enter 或「加入」新增"
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={addValue}
          className="rounded-lg border border-border px-2 py-1.5 text-sm hover:bg-muted"
        >
          加入
        </button>
      </div>
    </div>
  );
}
