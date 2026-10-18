"use client";

import { useState, useTransition } from "react";
import { regenerateChineseNodeSlugs, type SlugMigrationResult } from "@/lib/actions/slugMigration";

export function SlugMigrationRunner() {
  const [result, setResult] = useState<SlugMigrationResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => {
      const r = await regenerateChineseNodeSlugs();
      setResult(r);
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={handleRun}
        disabled={pending}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "執行中…" : "執行補發代稱"}
      </button>

      {result && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm">
          <p>
            這次改了 <span className="font-medium">{result.renamed.length}</span> 個條目的代稱,
            跳過 {result.skipped} 個(標題沒有中文字,或已經補過)。
          </p>
          {result.renamed.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
              {result.renamed.map((r) => (
                <li key={r.nodeId}>
                  {r.title}:{r.oldSlug} → {r.newSlug}
                </li>
              ))}
            </ul>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-xs text-danger">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
