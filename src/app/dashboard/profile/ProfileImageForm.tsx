"use client";

import { useActionState, useRef } from "react";
import type { ProfileFormState } from "@/lib/actions/profile";

export function ProfileImageForm({
  label,
  action,
  currentUrl,
  previewClassName,
}: {
  label: string;
  action: (
    prevState: ProfileFormState,
    formData: FormData,
  ) => Promise<ProfileFormState>;
  currentUrl: string | null;
  previewClassName: string;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

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
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
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
          disabled={isPending}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          {isPending ? "上傳中…" : "上傳"}
        </button>
      </form>
      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
    </div>
  );
}
