"use client";

import { useActionState } from "react";
import { uploadWorldMap, removeWorldMap } from "@/lib/actions/worldmap";

export function WorldMapSettingsForm({
  worldId,
  worldSlug,
  currentImageUrl,
  hasMap,
}: {
  worldId: string;
  worldSlug: string;
  currentImageUrl: string | null;
  hasMap: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadWorldMap, undefined);

  return (
    <div className="mt-4 flex max-w-xl flex-col gap-4">
      {currentImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
        <img
          src={currentImageUrl}
          alt="目前的世界地圖底圖"
          className="max-h-64 w-full rounded-lg border border-border object-contain bg-surface"
        />
      )}

      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="worldId" value={worldId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <label htmlFor="file" className="text-sm font-medium">
          {hasMap ? "更換底圖" : "上傳底圖"}(PNG / JPEG / WebP,最大 8MB)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="text-sm"
        />

        {state && "error" in state && (
          <p className="text-sm text-danger">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "上傳中…" : hasMap ? "更換底圖" : "上傳底圖"}
        </button>
      </form>

      {hasMap && (
        <form action={removeWorldMap.bind(null, worldId, worldSlug)}>
          <button
            type="submit"
            className="w-fit rounded-lg border border-danger px-4 py-2 text-sm text-danger transition hover:bg-danger-hover hover:text-danger-foreground"
          >
            移除底圖
          </button>
        </form>
      )}
    </div>
  );
}
