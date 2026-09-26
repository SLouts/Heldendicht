"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downscaleImageIfNeeded } from "@/lib/imageResize";
import {
  createProfileMediaUploadTicket,
  finalizeProfileMediaUpload,
  type ProfileMediaKind,
} from "@/lib/actions/profile";

const PROFILE_MEDIA_BUCKET = "profile-media";

export function ProfileImageForm({
  kind,
  label,
  currentUrl,
  previewClassName,
}: {
  kind: ProfileMediaKind;
  label: string;
  currentUrl: string | null;
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

      const ticket = await createProfileMediaUploadTicket(kind, file.type, file.size);
      if ("error" in ticket) {
        setError(ticket.error);
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(PROFILE_MEDIA_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) {
        setError("上傳失敗,請稍後再試");
        return;
      }

      const result = await finalizeProfileMediaUpload(kind, ticket.path);
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
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- public bucket 網址,無法用 next/image 白名單網域
        <img src={currentUrl} alt={label} className={previewClassName} />
      ) : (
        <div
          className={`${previewClassName} flex items-center justify-center bg-muted text-xs text-muted-foreground`}
        >
          尚未上傳
        </div>
      )}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          {pending ? "上傳中…" : "上傳"}
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
