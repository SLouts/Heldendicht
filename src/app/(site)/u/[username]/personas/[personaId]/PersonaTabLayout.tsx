import type { ReactNode } from "react";

/**
 * 每個分頁內容統一是「左側主內容 + 右側資訊欄」雙欄——沿用全站既有的
 * lg:grid-cols-12(8/4 欄,約 66.7%/33.3%)斷點慣例,跟世界觀首頁、節點
 * 詳細頁同一套,不另外發明 70/30 這種站上沒有先例的比例。手機收成單欄,
 * 資訊欄疊在主內容上方。
 */
export function PersonaTabLayout({ main, sidebar }: { main: ReactNode; sidebar: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="lg:order-2 lg:col-span-4">{sidebar}</div>
      <div className="lg:order-1 lg:col-span-8 lg:min-w-0">{main}</div>
    </div>
  );
}
