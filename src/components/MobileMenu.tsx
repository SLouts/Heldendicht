"use client";

import { useState, type ReactNode } from "react";

/**
 * 頁首右側導覽的行動版收合——桌面版(md 以上)照舊橫向鋪開,手機版摺成
 * 漢堡選單+下拉面板。兩邊共用同一份 children(不是各自維護一份導覽
 * 清單),用 CSS breakpoint 切換顯示,同一個做法在 WorldHero 六套主題
 * 版型也用過(渲染全部、交給 CSS 決定顯示哪個),這裡是同樣的邏輯。
 */
export function MobileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center">
      <nav className="hidden items-center gap-4 text-sm md:flex">{children}</nav>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "關閉選單" : "開啟選單"}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface md:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          {open ? (
            <path d="M3 3 L15 15 M15 3 L3 15" />
          ) : (
            <path d="M2 5h14M2 9h14M2 13h14" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 min-w-48 rounded-lg border border-border bg-surface p-2 shadow-sm md:hidden">
          <nav
            className="flex flex-col gap-1 text-sm [&_a]:min-h-11 [&_a]:rounded-md [&_a]:px-3 [&_a]:py-2 [&_a]:hover:bg-muted [&_button]:min-h-11 [&_button]:rounded-md [&_button]:px-3 [&_button]:py-2 [&_button]:text-left [&_button]:hover:bg-muted [&_form]:contents"
            onClick={() =>
              // 延後到下一個 tick 才收合——children 裡有登出用的
              // <form action={...}><button type="submit"> ,如果在同一個
              // click 事件裡就把這塊 DOM 收掉(setOpen(false) 同步重繪、
              // 把 form 從畫面上移除),瀏覽器會判定這顆 submit 按鈕已經
              // 不在文件裡,直接取消掉這次表單送出的預設行為,導致手機版
              // 點登出完全沒反應。setTimeout 讓送出先完成,選單才收合。
              setTimeout(() => setOpen(false), 0)
            }
          >
            {children}
          </nav>
        </div>
      )}
    </div>
  );
}
