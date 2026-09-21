"use client";

import { useState } from "react";
import { ART_THEMES, ART_THEME_ATTR, type ArtTheme } from "@/lib/artTheme";

const LABEL_BY_ID = new Map(ART_THEMES.map((t) => [t.id, t.label]));

/**
 * 只顯示「目前美術主題」的名稱,不重做一個選擇器——全站已經有右下角浮動的
 * ArtThemeSwitcher(RootLayout 裡,不用登入就能用),這裡只是提醒使用者
 * 現在套用的是哪一套,真的要切換請用那顆浮動按鈕。
 *
 * 主題狀態只存在瀏覽器 localStorage/DOM 屬性,Server Component 沒辦法在
 * 渲染當下知道,所以這是唯一需要 "use client" 的區塊——跟 ArtThemeSwitcher.tsx
 * 同一個慣例,用惰性初始值直接讀 DOM(bootstrap script 已經在 hydrate 之前
 * 把屬性設好了),不用額外開一個 effect 去同步。
 */
export function CurrentThemeBadge() {
  const [current] = useState<ArtTheme>(() => {
    if (typeof document === "undefined") return "illuminated";
    return (document.documentElement.getAttribute(ART_THEME_ATTR) as ArtTheme) || "illuminated";
  });

  return (
    <p className="text-sm">
      目前美術主題:
      <span className="font-medium">{LABEL_BY_ID.get(current)}</span>
      <span className="ml-1 text-muted-foreground">(切換請用畫面右下角的浮動按鈕)</span>
    </p>
  );
}
