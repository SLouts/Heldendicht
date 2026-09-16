"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage } from "@/lib/actions/messages";

export function MessageComposeForm({ recipientId }: { recipientId: string }) {
  const [state, formAction, pending] = useActionState(sendMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-4 flex flex-col gap-2"
    >
      <input type="hidden" name="recipientId" value={recipientId} />
      <textarea
        name="content"
        rows={3}
        required
        placeholder="輸入訊息…"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "傳送中…" : "傳送"}
      </button>
    </form>
  );
}
