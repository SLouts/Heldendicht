"use client";

import { useActionState, useRef } from "react";
import { importUsomapGeoJson } from "@/lib/actions/mapImport";

export function ImportMapForm({
  worldId,
  worldSlug,
}: {
  worldId: string;
  worldSlug: string;
}) {
  const [state, formAction, isPending] = useActionState(
    importUsomapGeoJson,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-3">
      <h3 className="text-sm font-semibold">從 USOMAP 匯入地點</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        上傳 USOMAP(架空地圖產生器)匯出的 .geojson 檔案,會自動把 city / nation
        / label 三種資料建立成地點節點,並直接標好在地圖上的位置。匯入的節點跟手動
        新增的一樣要先審核。
      </p>
      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="worldId" value={worldId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <input
          type="file"
          name="file"
          accept=".geojson,application/geo+json,application/json"
          required
          className="text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          {isPending ? "匯入中…" : "匯入"}
        </button>
      </form>
      {state && "error" in state && (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="mt-2 text-sm text-success">
          已匯入 {state.imported} 個地點(待審核)。
        </p>
      )}
    </div>
  );
}
