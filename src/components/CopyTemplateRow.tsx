"use client";

import { useState } from "react";

/**
 * 條目目錄裡,分類清單最頂端的「分類範本」列——外觀比照清單裡的真實
 * 條目(同樣的列高/分隔線),但內容是空的。點一下「拉開」,行為跟
 * NewNodeForm 的「條目範本」(NodeTemplatePreview)一樣:先展開看到
 * 完整格式的純文字,再按「複製純文字範本」才真正複製到剪貼簿——不是
 * 點一下列本身就直接複製,讓使用者在複製前能先看到範本長什麼樣子。
 * templateText 由呼叫端用跟 NewNodeForm 一樣的 buildCharacterTemplateText
 * 組好再傳進來。
 */
export function CopyTemplateRow({ templateText }: { templateText: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(templateText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪貼簿權限被擋(少見)——下面的純文字區塊本來就能手動選取複製,
      // 這裡不用另外顯示錯誤訊息。
    }
  }

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-2 text-left text-muted-foreground hover:text-foreground"
      >
        <span className="h-2 w-2 shrink-0 rounded-full border border-dashed border-muted-foreground" />
        <span>分類範本</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {open ? "收合 ▲" : "點開查看 ▼"}
        </span>
      </button>
      {open && (
        <div className="mt-2">
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
        </div>
      )}
    </li>
  );
}
