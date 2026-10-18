"use client";

export type FieldOption = {
  id: string;
  label: string;
  field_type: "text" | "select" | "range";
  options: string[];
};

export type EligibilityRule = { fieldId: string; requiredValue: string };

/**
 * 報名資格條件的動態欄位列——新增/編輯公告表單共用。送出時靠
 * name="ruleFieldId"/"ruleValue" 這兩組同長度陣列,actions/events.ts
 * 依索引配對成 {fieldId, requiredValue},不是 JSON 編碼。
 */
export function EventEligibilityRulesFields({
  fields,
  rules,
  onChange,
}: {
  fields: FieldOption[];
  rules: EligibilityRule[];
  onChange: (rules: EligibilityRule[]) => void;
}) {
  function addRule() {
    onChange([...rules, { fieldId: fields[0]?.id ?? "", requiredValue: "" }]);
  }
  function removeRule(index: number) {
    onChange(rules.filter((_, i) => i !== index));
  }
  function updateRule(index: number, patch: Partial<EligibilityRule>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-sm font-medium">報名資格條件(選填,全部條件都要符合)</p>
      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground">沒有條件代表所有 PC 都能報名。</p>
      )}
      {rules.map((rule, i) => {
        const field = fields.find((f) => f.id === rule.fieldId);
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              name="ruleFieldId"
              value={rule.fieldId}
              onChange={(e) => updateRule(i, { fieldId: e.target.value })}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            >
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">=</span>
            {field?.field_type === "select" ? (
              <select
                name="ruleValue"
                value={rule.requiredValue}
                onChange={(e) => updateRule(i, { requiredValue: e.target.value })}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              >
                <option value="" disabled>
                  選擇值
                </option>
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="ruleValue"
                value={rule.requiredValue}
                onChange={(e) => updateRule(i, { requiredValue: e.target.value })}
                required
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              />
            )}
            <button
              type="button"
              onClick={() => removeRule(i)}
              className="text-sm text-danger underline"
            >
              移除
            </button>
          </div>
        );
      })}
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          這個世界觀還沒有設定角色必填欄位,沒辦法加報名資格條件。
        </p>
      ) : (
        <button type="button" onClick={addRule} className="w-fit text-sm underline">
          + 新增條件
        </button>
      )}
    </div>
  );
}
