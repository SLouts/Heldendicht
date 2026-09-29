"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { suffix: "", label: "世界概覽" },
  { suffix: "/worldmap", label: "世界地圖" },
  { suffix: "/map", label: "關係圖譜" },
  { suffix: "/story", label: "故事時間軸" },
  { suffix: "/directory", label: "設定百科" },
] as const;

/**
 * 世界觀的單一階層主分頁導覽——概覽/地圖/關係圖譜/時間軸/設定百科
 * 都是各自獨立的路由(不是同一頁用 client state 切換),這裡只負責畫出
 * 一致的分頁列外觀+依目前網址判斷哪個分頁該亮起來。basePath 由呼叫端
 * 傳入 `/worlds/{slug}` 或 `/dashboard/worlds/{slug}`,同一份元件兩邊
 * 共用。
 */
export function WorldMainTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      className="flex gap-1 overflow-x-auto no-scrollbar border-b border-border"
    >
      {TABS.map((tab) => {
        const href = `${basePath}${tab.suffix}`;
        const isActive =
          tab.suffix === ""
            ? pathname === basePath
            : pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Link
            key={tab.suffix}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={
              "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-4 text-sm font-medium transition " +
              (isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
