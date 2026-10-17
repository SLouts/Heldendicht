"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { searchWorldNodes, type NodeSearchResult } from "@/lib/actions/nodeSearch";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { NODE_TYPE_LABEL, FALLBACK_NODE_TYPE_ORDER } from "@/lib/nodeTypeLabels";
import type { NodeType } from "@/lib/supabase/database.types";

const NODE_TYPE_FILTER_ORDER: NodeType[] = ["character", ...FALLBACK_NODE_TYPE_ORDER];
const DEBOUNCE_MS = 300;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 把搜尋結果的標題/內文片段裡,符合目前查詢字串的部分標亮出來(不分大小寫)。 */
function Highlighted({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-primary/25 text-foreground">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function NodeSearchBox({
  worldId,
  basePath,
}: {
  worldId: string;
  /** 搜尋結果連去哪個前綴——公開頁面用 /worlds/[slug]/nodes,後台頁面用 /dashboard/worlds/[slug]/nodes。 */
  basePath: string;
}) {
  const [query, setQuery] = useState("");
  const [nodeType, setNodeType] = useState<NodeType | "all">("all");
  const [results, setResults] = useState<NodeSearchResult[] | null>(null);
  // 跟目前顯示的 results 對應的查詢字串——標亮要用這個,不能直接用
  // query state:debounce 期間使用者可能已經繼續打字,query 會比畫面上
  // 顯示的這批結果新,拿來標亮會對不上實際命中的字。
  const [highlightQuery, setHighlightQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runSearch(q: string, type: NodeType | "all") {
    if (!q.trim() && type === "all") {
      setResults(null);
      return;
    }
    startTransition(async () => {
      const found = await searchWorldNodes(worldId, q, type);
      setResults(found);
      setHighlightQuery(q);
    });
  }

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(query, nodeType), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, nodeType]);

  function handleEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    runSearch(query, nodeType);
  }

  const hasSearched = results !== null;

  return (
    <div className="mt-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleEnter}
        placeholder="搜尋這個世界觀裡的條目…"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setNodeType("all")}
          className={
            "rounded-full px-2.5 py-1 text-xs " +
            (nodeType === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-badge-neutral-bg text-badge-neutral-fg hover:opacity-80")
          }
        >
          全部類型
        </button>
        {NODE_TYPE_FILTER_ORDER.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setNodeType(type)}
            className={
              "rounded-full px-2.5 py-1 text-xs " +
              (nodeType === type
                ? "bg-primary text-primary-foreground"
                : "bg-badge-neutral-bg text-badge-neutral-fg hover:opacity-80")
            }
          >
            {NODE_TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      {isPending && <p className="mt-3 text-sm text-muted-foreground">搜尋中…</p>}

      {!isPending && hasSearched && (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {results.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">沒有找到符合的條目。</p>
          )}
          {results.map((result) => (
            <li key={result.id} className="py-3">
              <Link
                href={`${basePath}/${result.slug}`}
                className="flex flex-wrap items-center gap-2 hover:underline"
              >
                <span className="rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg">
                  {NODE_TYPE_LABEL[result.nodeType]}
                </span>
                <span className="font-medium">
                  <Highlighted text={result.title} query={highlightQuery} />
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(result.updatedAt)}
                </span>
              </Link>
              {result.snippet && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  <Highlighted text={result.snippet} query={highlightQuery} />
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
