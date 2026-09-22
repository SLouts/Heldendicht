"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { searchUsers, type UserSearchResult } from "@/lib/actions/userSearch";
import { FollowListCard } from "./FollowListCard";
import { FollowButton } from "./FollowButton";

const DEBOUNCE_MS = 300;

/**
 * 搜尋使用者(找人追蹤/私訊)——UX 跟 NodeSearchBox(世界觀內條目搜尋)
 * 同一套:輸入框 debounce 後呼叫 Server Action,結果用既有的
 * FollowListCard/FollowButton 呈現,不重新發明卡片樣式。
 */
export function UserSearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runSearch(q: string) {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    startTransition(async () => {
      const found = await searchUsers(q);
      setResults(found);
    });
  }

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  function handleEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    runSearch(query);
  }

  const hasSearched = results !== null;

  return (
    <div className="mb-6">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleEnter}
        placeholder="搜尋使用者(暱稱或帳號)…"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />

      {isPending && <p className="mt-2 text-sm text-muted-foreground">搜尋中…</p>}

      {!isPending && hasSearched && (
        <div className="mt-2 flex flex-col gap-2">
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">沒有找到符合的使用者。</p>
          )}
          {results.map((result) => (
            <FollowListCard
              key={result.id}
              profile={result}
              action={
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/dashboard/messages/${result.id}`}
                    className="text-xs text-muted-foreground underline"
                  >
                    私訊
                  </Link>
                  <FollowButton
                    followeeId={result.id}
                    username={result.username ?? ""}
                    initialFollowing={result.isFollowing}
                  />
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
