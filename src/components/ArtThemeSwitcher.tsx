"use client";

import { useEffect, useRef, useState } from "react";
import {
  ART_THEME_ATTR,
  ART_THEME_STORAGE_KEY,
  ART_THEMES,
  type ArtTheme,
} from "@/lib/artTheme";

/**
 * 全站浮動的美術方向切換器——不用登入、不用進到特定頁面就能用,
 * 純粹是瀏覽器端的顯示偏好,存 localStorage。放在 RootLayout 裡,
 * 所以公開頁面跟後台都會出現。
 */
export function ArtThemeSwitcher() {
  const [open, setOpen] = useState(false);
  // 惰性初始值直接讀 DOM——bootstrap script 已經在 hydrate 之前把屬性
  // 設好了,這裡不用另外開一個 effect 去同步,避免多一次 render。
  const [current, setCurrent] = useState<ArtTheme>(() => {
    if (typeof document === "undefined") return "illuminated";
    return (document.documentElement.getAttribute(ART_THEME_ATTR) as ArtTheme) || "illuminated";
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function choose(id: ArtTheme) {
    document.documentElement.setAttribute(ART_THEME_ATTR, id);
    try {
      localStorage.setItem(ART_THEME_STORAGE_KEY, id);
    } catch {
      // 私密瀏覽模式等情境存不進去也無妨,單純這次瀏覽套用不了偏好而已。
    }
    setCurrent(id);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="fixed bottom-4 right-4 z-30 text-sm">
      {open && (
        <div className="mb-2 flex flex-col gap-1 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          {ART_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => choose(t.id)}
              aria-pressed={current === t.id}
              className={
                "rounded-md px-3 py-1.5 text-left transition " +
                (current === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="切換美術方向"
        className="rounded-full border border-border bg-surface px-3 py-2 shadow-lg hover:bg-muted"
      >
        美術方向
      </button>
    </div>
  );
}
