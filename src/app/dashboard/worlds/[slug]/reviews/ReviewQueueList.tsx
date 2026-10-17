"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { reviewNode, batchReviewNodes } from "@/lib/actions/nodes";

export type ReviewQueueNode = {
  id: string;
  title: string;
  slug: string;
  nodeTypeLabel: string;
  preview: string;
  creatorLabel: string;
  createdAt: string;
};

export type StubQueueNode = {
  id: string;
  title: string;
  slug: string;
  creatorLabel: string;
  createdAt: string;
};

/**
 * 審核佇列的清單+批次操作——勾選多個節點後按「批次核准/駁回」,逐一呼叫
 * reviewNode(沒有單一 SQL 可以一次核准還要各自 revalidate 路徑,乾脆用
 * batchReviewNodes 一次 UPDATE 多筆,動作完再整頁重新整理拿最新清單)。
 * 待撰寫的佔位節點(stubNodes)不能核准,只顯示「前往補完」連結。
 */
export function ReviewQueueList({
  worldSlug,
  nodes,
  stubNodes,
}: {
  worldSlug: string;
  nodes: ReviewQueueNode[];
  stubNodes: StubQueueNode[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [pendingSingle, setPendingSingle] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === nodes.length ? new Set() : new Set(nodes.map((n) => n.id))));
  }

  function handleBatch(decision: "approved" | "rejected") {
    if (selected.size === 0) return;
    startTransition(async () => {
      await batchReviewNodes([...selected], worldSlug, decision);
      setSelected(new Set());
      window.location.reload();
    });
  }

  function handleSingle(nodeId: string, nodeSlug: string, decision: "approved" | "rejected") {
    setPendingSingle(nodeId);
    startTransition(async () => {
      try {
        await reviewNode(nodeId, worldSlug, nodeSlug, decision);
        window.location.reload();
      } finally {
        setPendingSingle(null);
      }
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">待審核節點({nodes.length})</h2>
          {nodes.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selected.size === nodes.length && nodes.length > 0}
                  onChange={toggleAll}
                />
                全選
              </label>
              <button
                type="button"
                disabled={pending || selected.size === 0}
                onClick={() => handleBatch("approved")}
                className="rounded-lg bg-success px-3 py-1.5 text-sm text-success-foreground transition hover:bg-success-hover disabled:opacity-50"
              >
                批次核准({selected.size})
              </button>
              <button
                type="button"
                disabled={pending || selected.size === 0}
                onClick={() => handleBatch("rejected")}
                className="rounded-lg bg-danger px-3 py-1.5 text-sm text-danger-foreground transition hover:bg-danger-hover disabled:opacity-50"
              >
                批次駁回({selected.size})
              </button>
            </div>
          )}
        </div>

        <ul className="mt-3 flex flex-col gap-3">
          {nodes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(n.id)}
                  onChange={() => toggle(n.id)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/worlds/${worldSlug}/nodes/${n.slug}`}
                      className="font-medium hover:underline"
                    >
                      {n.title}
                    </Link>
                    <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
                      {n.nodeTypeLabel}
                    </span>
                  </div>
                  {n.preview && (
                    <p className="mt-1 text-sm text-muted-foreground">{n.preview}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.creatorLabel} 於 {new Date(n.createdAt).toLocaleString("zh-TW")} 建立
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pendingSingle === n.id}
                      onClick={() => handleSingle(n.id, n.slug, "approved")}
                      className="rounded-lg bg-success px-3 py-1 text-xs text-success-foreground transition hover:bg-success-hover disabled:opacity-50"
                    >
                      核准
                    </button>
                    <button
                      type="button"
                      disabled={pendingSingle === n.id}
                      onClick={() => handleSingle(n.id, n.slug, "rejected")}
                      className="rounded-lg bg-danger px-3 py-1 text-xs text-danger-foreground transition hover:bg-danger-hover disabled:opacity-50"
                    >
                      駁回
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {nodes.length === 0 && (
            <li className="text-sm text-muted-foreground">目前沒有待審核的節點。</li>
          )}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold">待撰寫({stubNodes.length})</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          WikiLink 自動建立的佔位節點,還沒補上類型跟內文,不算進上面的待審核——等建立者補完才會真正進入審核。
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {stubNodes.map((n) => (
            <li
              key={n.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3 text-sm"
            >
              <span>
                {n.title}
                <span className="ml-2 text-xs text-muted-foreground">
                  {n.creatorLabel} 於 {new Date(n.createdAt).toLocaleString("zh-TW")} 建立
                </span>
              </span>
              <Link
                href={`/dashboard/worlds/${worldSlug}/nodes/${n.slug}`}
                className="text-xs underline"
              >
                前往補完
              </Link>
            </li>
          ))}
          {stubNodes.length === 0 && (
            <li className="text-sm text-muted-foreground">目前沒有待撰寫的節點。</li>
          )}
        </ul>
      </div>
    </div>
  );
}
