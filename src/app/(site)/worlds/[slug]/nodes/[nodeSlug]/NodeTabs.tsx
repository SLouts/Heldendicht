"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type NodeTab = {
  key: string;
  label: string;
  content: ReactNode;
};

/**
 * 節點主內容區的分頁切換——最多 4 個分頁。樣式只綁
 * border-primary/text-primary/text-muted-foreground 這些 CSS 變數 token,
 * 自然跟著 <html data-art-theme> 換色,不用像 NodeHero/CharacterTimelineDisplay
 * 那樣手刻各主題版型。
 *
 * 預設只是本地 state,不同步 URL——節點詳細頁目前還是這樣用。`syncParam`
 * 是選用的:傳了的話(目前只有世界觀首頁的分頁用到),切換分頁會同步寫入
 * 這個名字的 query string(例如 ?tab=rules),分享連結/重新整理都能回到
 * 同一個分頁;不傳就維持原本「純前端記憶,換頁就重置」的行為。
 */
export function NodeTabs({ tabs, syncParam }: { tabs: NodeTab[]; syncParam?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlKey = syncParam ? searchParams.get(syncParam) : null;
  const initialKey =
    (urlKey && tabs.some((t) => t.key === urlKey) ? urlKey : undefined) ?? tabs[0]?.key;
  const [localActiveKey, setLocalActiveKey] = useState(initialKey);

  if (tabs.length === 0) return null;

  // 有 syncParam 時以網址上的值為準(方便分享連結/重新整理後定位到同一
  // 分頁),沒有對應的分頁 key 時退回第一個分頁,不是直接維持本地 state。
  const activeKey = syncParam ? (urlKey && tabs.some((t) => t.key === urlKey) ? urlKey : tabs[0]?.key) : localActiveKey;
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  function selectTab(key: string) {
    if (syncParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(syncParam, key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else {
      setLocalActiveKey(key);
    }
  }

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === activeTab.key}
            onClick={() => selectTab(tab.key)}
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
