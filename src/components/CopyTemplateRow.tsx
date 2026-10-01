"use client";

import { useState } from "react";

/**
 * 條目目錄裡,分類清單最頂端的「複製分類範本」列——外觀比照清單裡的
 * 真實條目(同樣的列高/分隔線),但內容是空的,點一下直接把這個分類
 * 的範本文字複製到剪貼簿,不用像 NewNodeForm 的「條目範本」那樣先展開
 * 面板再按複製。templateText 由呼叫端用跟 NewNodeForm 一樣的
 * buildCharacterTemplateText 組好再傳進來,這裡只負責複製互動。
 */
export function CopyTemplateRow({ templateText }: { templateText: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(templateText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪貼簿權限被擋(少見)——使用者仍然可以到新增節點頁面的「條目
      // 範本」區塊手動選取複製,這裡不用另外顯示錯誤訊息。
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="flex w-full flex-wrap items-center gap-2 py-3 text-left text-muted-foreground hover:text-foreground"
      >
        <span className="h-2 w-2 shrink-0 rounded-full border border-dashed border-muted-foreground" />
        <span>{copied ? "已複製" : "複製分類範本"}</span>
        <span className="ml-auto text-xs text-muted-foreground">點擊複製純文字範本</span>
      </button>
    </li>
  );
}
