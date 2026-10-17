"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const WORLD_SORT_OPTIONS = [
  { value: "updated", label: "最近更新" },
  { value: "newest", label: "最新建立" },
  { value: "nodes", label: "條目數最多" },
  { value: "name", label: "名稱排序" },
] as const;

export type WorldSort = (typeof WORLD_SORT_OPTIONS)[number]["value"];

/**
 * /worlds 列表的搜尋/排序控制——寫回網址的 ?q=/?sort=,讓篩選結果本身
 * 也能被分享/重新整理不跑掉,跟世界觀首頁分頁籤同步 URL 的做法一致。
 * 搜尋框 debounce 300ms 才更新網址,避免每打一個字就重新整理整頁清單。
 */
export function WorldsListControls({
  initialQuery,
  initialSort,
}: {
  initialQuery: string;
  initialSort: WorldSort;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParams(next: { q?: string; sort?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.sort !== undefined) {
      if (next.sort && next.sort !== "updated") params.set("sort", next.sort);
      else params.delete("sort");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => updateParams({ q: query }), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋世界觀名稱或簡介…"
        className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      <select
        defaultValue={initialSort}
        onChange={(e) => updateParams({ sort: e.target.value })}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      >
        {WORLD_SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
