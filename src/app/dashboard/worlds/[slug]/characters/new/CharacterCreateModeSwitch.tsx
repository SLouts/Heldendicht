"use client";

import { useState, type ReactNode } from "react";

/**
 * 「手動填寫」跟「貼上文字匯入」兩種建立角色的方式共用同一個頁面,
 * 純本地 state 切換,不影響任何一邊表單各自的 Server Action。
 */
export function CharacterCreateModeSwitch({
  manual,
  importForm,
}: {
  manual: ReactNode;
  importForm: ReactNode;
}) {
  const [mode, setMode] = useState<"manual" | "import">("manual");

  return (
    <div>
      <div className="mt-4 flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={
            "border-b-2 px-4 py-2 text-sm font-medium transition " +
            (mode === "manual"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground")
          }
        >
          手動填寫
        </button>
        <button
          type="button"
          onClick={() => setMode("import")}
          className={
            "border-b-2 px-4 py-2 text-sm font-medium transition " +
            (mode === "import"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground")
          }
        >
          貼上文字匯入
        </button>
      </div>
      {mode === "manual" ? manual : importForm}
    </div>
  );
}
