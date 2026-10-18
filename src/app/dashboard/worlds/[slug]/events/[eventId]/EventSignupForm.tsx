"use client";

import { useActionState } from "react";
import { signUpForEvent } from "@/lib/actions/events";

export function EventSignupForm({
  eventId,
  worldSlug,
  characters,
}: {
  eventId: string;
  worldSlug: string;
  characters: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(signUpForEvent, undefined);

  return (
    <form
      action={formAction}
      className="mt-6 flex max-w-sm flex-col gap-2 rounded-lg border border-border bg-surface p-4"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />
      <label htmlFor="characterNodeId" className="text-sm font-medium">
        選擇要報名的角色
      </label>
      <select
        id="characterNodeId"
        name="characterNodeId"
        required
        className="rounded-lg border border-border bg-background px-3 py-2"
      >
        {characters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}
      {state && "fieldErrors" in state && (
        <p className="text-sm text-danger">{Object.values(state.fieldErrors).flat()[0]}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "報名中…" : "報名"}
      </button>
    </form>
  );
}
