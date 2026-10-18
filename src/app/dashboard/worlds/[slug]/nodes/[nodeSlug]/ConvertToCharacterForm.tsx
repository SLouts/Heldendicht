"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertNodeToCharacter } from "@/lib/actions/characters";

/**
 * 待撰寫節點如果其實是角色,直接轉換成角色,保留原本指向這個節點的
 * wikilinks——取代之前「刪掉重建」的做法(見 EditNodeForm 旁邊拿掉的
 * 那段提示文字)。轉換後節點 id/slug 不變,用 router.refresh() 重新跑
 * 一次這個 Server Component 頁面,畫面就會變成角色頁的樣子,不用整頁
 * 導頁。
 */
export function ConvertToCharacterForm({
  nodeId,
  worldSlug,
  nodeSlug,
}: {
  nodeId: string;
  worldSlug: string;
  nodeSlug: string;
}) {
  const router = useRouter();
  const [characterType, setCharacterType] = useState<"pc" | "npc">("npc");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await convertNodeToCharacter(nodeId, worldSlug, nodeSlug, characterType);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-background p-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="convert-character-type" className="text-xs font-medium">
          如果這個名稱其實是角色,直接轉換(會保留原本的 WikiLink 連結)
        </label>
        <select
          id="convert-character-type"
          value={characterType}
          onChange={(e) => setCharacterType(e.target.value as "pc" | "npc")}
          className="w-32 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
        >
          <option value="npc">NPC</option>
          <option value="pc">PC(我的角色)</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-50"
      >
        {pending ? "轉換中…" : "轉換成角色"}
      </button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </form>
  );
}
