"use client";

import { useState, type ReactNode } from "react";

export type NodeTab = {
  key: string;
  label: string;
  content: ReactNode;
};

/**
 * 節點主內容區的分頁切換——最多 4 個分頁,單純用本地 state 切換,不同步
 * URL/hash。樣式只綁 border-primary/text-primary/text-muted-foreground
 * 這些 CSS 變數 token,自然跟著 <html data-art-theme> 換色,不用像
 * NodeHero/CharacterTimelineDisplay 那樣手刻各主題版型。
 */
export function NodeTabs({ tabs }: { tabs: NodeTab[] }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  if (tabs.length === 0) return null;

  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
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
        ))}
      </div>
      <div role="tabpanel" className="pt-4">
        {activeTab.content}
      </div>
    </div>
  );
}
