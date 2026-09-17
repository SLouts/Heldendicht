"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downscaleImageIfNeeded } from "@/lib/imageResize";
import {
  createWorldMediaUploadTicket,
  finalizeWorldMediaUpload,
  removeWorldMedia,
  type WorldMediaKind,
} from "@/lib/actions/worldMedia";

const WORLD_MEDIA_BUCKET = "world-media";

export function WorldMediaUpload({
  kind,
  label,
  worldId,
  worldSlug,
  imageUrl,
  previewClassName,
}: {
  kind: WorldMediaKind;
  label: string;
  worldId: string;
  worldSlug: string;
  imageUrl: string | null;
  previewClassName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const originalFile = fileInput.files?.[0];
    if (!originalFile) {
      setError("請選擇一張圖片");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const file = await downscaleImageIfNeeded(originalFile);

      const ticket = await createWorldMediaUploadTicket(kind, worldId, file.type, file.size);
      if ("error" in ticket) {
        setError(ticket.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(WORLD_MEDIA_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) {
        setError("上傳失敗,請稍後再試");
        return;
      }

      const result = await finalizeWorldMediaUpload(kind, worldId, worldSlug, ticket.path);
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
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
        <img src={imageUrl} alt={`${label}預覽`} className={previewClassName} />
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="text-xs"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "上傳中…" : imageUrl ? `更換${label}` : `上傳${label}`}
        </button>
        {imageUrl && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`確定要移除${label}嗎?`)) {
                void removeWorldMedia(kind, worldId, worldSlug);
              }
            }}
            className="text-xs text-danger underline"
          >
            移除
          </button>
        )}
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
