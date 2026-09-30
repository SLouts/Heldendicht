"use client";

import { useMemo, useState } from "react";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { buildCharacterTemplateText } from "@/lib/characterTemplate";

/**
 * 條目範本展示——跟角色卡範本(CharacterTemplatePreview)共用同一份純
 * 文字組版邏輯。條目沒有跨分類的共用欄位,範本內容完全來自「目前選取
 * 分類」的必填/選填欄位,所以還沒選分類、或選到的分類沒設欄位時不顯示,
 * 换分類時範本內容也跟著換。
 */
export function NodeTemplatePreview({
  fields,
}: {
  fields: { label: string; exampleValue: string }[];
}) {
  const [copied, setCopied] = useState(false);

  const templateText = useMemo(
    () =>
      buildCharacterTemplateText(
        fields.map((f) => ({ label: f.label, exampleValue: f.exampleValue })),
        [],
      ),
    [fields],
  );

  if (fields.length === 0) return null;

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
    <CollapsibleSection title="條目範本" description="點開查看完整格式,可直接複製貼上再修改">
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
  );
}
