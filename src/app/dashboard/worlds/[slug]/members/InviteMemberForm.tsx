"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import {
  addMember,
  searchInviteCandidates,
  type InviteCandidate,
} from "@/lib/actions/memberships";

/**
 * 加成員改成用使用者名稱搜尋(輸入至少 2 個字後打一次 debounce 查詢),
 * 從清單裡選一個人再送出——不再要求輸入對方的完整 Email,因為「查得到
 * /查不到」本身就能拿來試探某個 Email 有沒有註冊過帳號,username 是
 * 到處都看得到的公開資訊,沒有這個問題。
 */
export function InviteMemberForm({
  worldId,
  worldSlug,
}: {
  worldId: string;
  worldSlug: string;
}) {
  const [state, formAction, pending] = useActionState(addMember, undefined);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InviteCandidate[]>([]);
  const [selected, setSelected] = useState<InviteCandidate | null>(null);
  const [role, setRole] = useState<"member" | "editor" | "admin">("member");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    const hasError = Boolean(state && ("error" in state || "fieldErrors" in state));
    if (wasPending.current && !pending && !hasError) {
      setSelected(null);
      setQuery("");
    }
    wasPending.current = pending;
  }, [pending, state]);

  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const candidates = await searchInviteCandidates(worldId, query);
      setResults(candidates);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected, worldId]);

  // 查詢字數不夠或已經選好人時不顯示清單,不用額外在 effect 裡同步清空
  // results state(避免 effect 內直接 setState 觸發連鎖重渲染)。
  const visibleResults = !selected && query.trim().length >= 2 ? results : [];

  function pick(candidate: InviteCandidate) {
    setSelected(candidate);
    setResults([]);
  }

  function reset() {
    setSelected(null);
    setQuery("");
  }

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />
      {selected && <input type="hidden" name="userId" value={selected.id} />}

      <div className="relative flex flex-col gap-1">
        <label htmlFor="username-search" className="text-sm font-medium">
          使用者名稱
        </label>
        {selected ? (
          <div className="flex w-64 items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
            <span className="text-sm">
              {selected.displayName || selected.username}
              {selected.username && (
                <span className="ml-1 text-xs text-muted-foreground">@{selected.username}</span>
              )}
            </span>
            <button type="button" onClick={reset} className="text-xs text-muted-foreground underline">
              重新選擇
            </button>
          </div>
        ) : (
          <>
            <input
              id="username-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="輸入對方的使用者名稱搜尋"
              autoComplete="off"
              className="w-64 rounded-lg border border-border bg-surface px-3 py-2"
            />
            {visibleResults.length > 0 && (
              <ul className="absolute top-full z-10 mt-1 w-64 rounded-lg border border-border bg-surface shadow-lg">
                {visibleResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pick(c)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      {c.displayName || c.username}
                      {c.username && (
                        <span className="ml-1 text-xs text-muted-foreground">@{c.username}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium">
          角色
        </label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "member" | "editor" | "admin")}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        >
          <option value="member">一般成員</option>
          <option value="editor">編輯</option>
          <option value="admin">主辦</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending || !selected}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "加入中…" : "加入這個世界觀"}
      </button>

      {state && "error" in state && (
        <p className="w-full text-sm text-danger">{state.error}</p>
      )}
      {state && "fieldErrors" in state && (
        <p className="w-full text-sm text-danger">
          {Object.values(state.fieldErrors).flat()[0]}
        </p>
      )}
    </form>
  );
}
