"use client";

import { useMemo, useState } from "react";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { buildCharacterTemplateText } from "@/lib/characterTemplate";

/**
 * 角色卡範本展示——把世界觀「必填欄位」+「補充章節」的範例值組成一份
 * 純文字,給玩家複製貼上再修改。格式跟「貼上文字自動匯入」的解析規則
 * 完全對齊,複製這份範本、改完範例值貼回匯入分頁,一樣拆得回來。
 */
export function CharacterTemplatePreview({
  fields,
  sections,
}: {
  fields: { label: string; example_value: string }[];
  sections: { label: string; example_content: string }[];
}) {
  const [copied, setCopied] = useState(false);

  const templateText = useMemo(
    () =>
      buildCharacterTemplateText(
        fields.map((f) => ({ label: f.label, exampleValue: f.example_value })),
        sections.map((s) => ({ label: s.label, exampleContent: s.example_content })),
      ),
    [fields, sections],
  );

  if (fields.length === 0 && sections.length === 0) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(templateText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪貼簿權限被擋(少見,例如非 HTTPS 或瀏覽器設定)——使用者仍然可以
      // 從下面的文字方塊手動選取複製,不用另外顯示錯誤訊息。
    }
  }

  return (
    <div className="mt-6">
      <CollapsibleSection title="角色卡範本" description="點開查看完整格式,可直接複製貼上再修改">
        <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 font-mono text-sm">
          {templateText}
        </pre>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="mt-2 w-fit rounded-lg border border-border bg-surface px-3 py-1.5 text-sm transition hover:bg-muted"
        >
          {copied ? "已複製" : "複製純文字範本"}
        </button>
      </CollapsibleSection>
    </div>
  );
}
