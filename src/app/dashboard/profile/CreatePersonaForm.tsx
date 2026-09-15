"use client";

import { useActionState, useRef } from "react";
import { createPersona } from "@/lib/actions/personas";

export function CreatePersonaForm() {
  const [state, formAction, pending] = useActionState(createPersona, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="persona-name" className="text-sm font-medium">
          角色名字
        </label>
        <input
          id="persona-name"
          name="name"
          required
          className="w-48 rounded-lg border border-border bg-background px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="persona-bio" className="text-sm font-medium">
          簡介(選填)
        </label>
        <input
          id="persona-bio"
          name="bio"
          className="w-64 rounded-lg border border-border bg-background px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "建立中…" : "+ 新增跨世界觀角色"}
      </button>
      {state && "error" in state && (
        <p className="w-full text-sm text-danger">{state.error}</p>
      )}
      {state && "fieldErrors" in state && (
        <p className="w-full text-sm text-danger">
          {Object.values(state.fieldErrors).flat()[0]}
        </p>
      )}
    </form>
  );
}
