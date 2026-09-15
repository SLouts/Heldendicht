"use client";

import { useActionState, useRef, useState } from "react";
import { createPersona } from "@/lib/actions/personas";
import { PersonaFieldsEditor } from "./PersonaFieldsEditor";

export function CreatePersonaForm() {
  const [state, formAction, pending] = useActionState(createPersona, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [resetKey, setResetKey] = useState(0);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
        setResetKey((k) => k + 1);
      }}
      className="mt-4 flex max-w-xl flex-col gap-3 rounded-lg border border-dashed border-border p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="persona-name" className="text-sm font-medium">
          角色名字
        </label>
        <input
          id="persona-name"
          name="name"
          required
          className="rounded-lg border border-border bg-background px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="persona-tagline" className="text-sm font-medium">
          一句話介紹(選填)
        </label>
        <input
          id="persona-tagline"
          name="tagline"
          placeholder="例如角色的座右銘或一句台詞"
          className="rounded-lg border border-border bg-background px-3 py-2"
        />
      </div>
      <PersonaFieldsEditor key={resetKey} initialFields={[]} />
      <div className="flex flex-col gap-1">
        <label htmlFor="persona-bio" className="text-sm font-medium">
          簡介(選填)
        </label>
        <textarea
          id="persona-bio"
          name="bio"
          rows={3}
          className="rounded-lg border border-border bg-background px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "建立中…" : "+ 新增跨世界觀角色"}
      </button>
      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      {state && "fieldErrors" in state && (
        <p className="text-sm text-danger">
          {Object.values(state.fieldErrors).flat()[0]}
        </p>
      )}
    </form>
  );
}
