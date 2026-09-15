"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downscaleImageIfNeeded } from "@/lib/imageResize";
import {
  createWorldMapUploadTicket,
  finalizeWorldMapUpload,
  removeWorldMap,
} from "@/lib/actions/worldmap";

const WORLD_MAP_BUCKET = "world-maps";

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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // 兩段式上傳(見 lib/actions/worldmap.ts 的說明):先跟我們的
  // Server Action 要一張簽名上傳票券,瀏覽器再直接把檔案傳到
  // Supabase Storage,完全不經過我們自己的 server,不會受 Vercel
  // serverless function 的 request body 大小限制影響。
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = e.currentTarget.elements.namedItem(
      "file",
    ) as HTMLInputElement;
    const originalFile = fileInput.files?.[0];
    if (!originalFile) {
      setError("請選擇一張圖片");
      return;
    }

    setError(null);
    setPending(true);
    try {
      // 尺寸過大的圖片先在瀏覽器端縮小,避免存進去的底圖解析度高到讓部分
      // 裝置在拖曳/縮放地圖時嚴重卡頓(細節見 lib/imageResize.ts)。
      const file = await downscaleImageIfNeeded(originalFile);

      const ticket = await createWorldMapUploadTicket(
        worldId,
        file.type,
        file.size,
      );
      if ("error" in ticket) {
        setError(ticket.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(WORLD_MAP_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type,
        });
      if (uploadError) {
        setError("上傳失敗,請稍後再試");
        return;
      }

      const result = await finalizeWorldMapUpload(
        worldId,
        worldSlug,
        ticket.path,
      );
      if (result && "error" in result) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
    } catch {
      setError("上傳失敗,請稍後再試");
    } finally {
      setPending(false);
    }
  }

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

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
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

        {error && <p className="text-sm text-danger">{error}</p>}

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
