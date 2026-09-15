"use client";

import { useActionState } from "react";
import { setCharacterPersona } from "@/lib/actions/personas";

export function CharacterPersonaForm({
  nodeId,
  worldSlug,
  nodeSlug,
  currentPersonaId,
  personas,
}: {
  nodeId: string;
  worldSlug: string;
  nodeSlug: string;
  currentPersonaId: string | null;
  personas: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    setCharacterPersona,
    undefined,
  );

  return (
    <form
      action={formAction}
      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
    >
      <input type="hidden" name="nodeId" value={nodeId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />
      <input type="hidden" name="nodeSlug" value={nodeSlug} />
      <label htmlFor="personaId" className="text-muted-foreground">
        跨世界觀角色身分:
      </label>
      <select
        id="personaId"
        name="personaId"
        defaultValue={currentPersonaId ?? ""}
        className="rounded-lg border border-border bg-background px-2 py-1"
      >
        <option value="">不連結</option>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border bg-background px-3 py-1 hover:bg-muted disabled:opacity-50"
      >
        {pending ? "更新中…" : "更新"}
      </button>
      {personas.length === 0 && (
        <span className="text-xs text-muted-foreground">
          到「個人頁面」建立跨世界觀角色身分後才能連結。
        </span>
      )}
      {state && "error" in state && (
        <p className="w-full text-danger">{state.error}</p>
      )}
    </form>
  );
}
