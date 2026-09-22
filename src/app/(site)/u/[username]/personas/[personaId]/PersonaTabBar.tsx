"use client";

import { useState } from "react";
import type { NodeTab } from "@/app/(site)/worlds/[slug]/nodes/[nodeSlug]/NodeTabs";

const MAX_VISIBLE_TABS = 4;

/**
 * 跟 NodeTabs 同一套「本地 state 切換,不同步 URL」的分頁邏輯,但這裡的
 * 分頁數量不固定(一個 persona 可能連結很多個世界觀節點,不像一般節點
 * 頁固定最多 4 個),超過 MAX_VISIBLE_TABS 的部分收進「更多」摺疊區,
 * 而不是讓分頁列一路橫向擠爆。不直接改 NodeTabs 本身——NodeTabs 是全站
 * 節點頁共用的既有元件,這裡的摺疊需求是這個頁面獨有的,不該讓既有元件
 * 承擔額外複雜度。
 */
export function PersonaTabBar({ tabs }: { tabs: NodeTab[] }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const [showMore, setShowMore] = useState(false);
  if (tabs.length === 0) return null;

  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];
  const visibleTabs = tabs.slice(0, MAX_VISIBLE_TABS);
  const overflowTabs = tabs.slice(MAX_VISIBLE_TABS);
  const activeInOverflow = overflowTabs.some((tab) => tab.key === activeTab.key);

  function TabButton({ tab }: { tab: NodeTab }) {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={tab.key === activeTab.key}
        onClick={() => setActiveKey(tab.key)}
        className={
          "shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition " +
          (tab.key === activeTab.key
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground")
        }
      >
        {tab.label}
      </button>
    );
  }

  return (
    <div>
      <div role="tablist" className="flex flex-wrap items-center gap-1 border-b border-border">
        {visibleTabs.map((tab) => (
          <TabButton key={tab.key} tab={tab} />
        ))}
        {overflowTabs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={
              "shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition " +
              (activeInOverflow
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            更多 {showMore ? "▴" : "▾"}
          </button>
        )}
      </div>
      {showMore && overflowTabs.length > 0 && (
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-border bg-muted/30">
          {overflowTabs.map((tab) => (
            <TabButton key={tab.key} tab={tab} />
          ))}
        </div>
      )}
      <div role="tabpanel" className="pt-4">
        {activeTab.content}
      </div>
    </div>
  );
}
