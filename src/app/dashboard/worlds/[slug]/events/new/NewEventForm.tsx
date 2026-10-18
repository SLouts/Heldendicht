"use client";

import { useActionState, useState } from "react";
import { createEvent } from "@/lib/actions/events";
import {
  EventEligibilityRulesFields,
  type FieldRuleGroup,
  type FieldOption,
} from "../EventEligibilityRulesFields";

export function NewEventForm({
  worldId,
  worldSlug,
  fields,
}: {
  worldId: string;
  worldSlug: string;
  fields: FieldOption[];
}) {
  const [state, formAction, pending] = useActionState(createEvent, undefined);
  const [rules, setRules] = useState<FieldRuleGroup[]>([]);

  return (
    <form action={formAction} className="mt-4 flex max-w-xl flex-col gap-4">
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          公告標題
        </label>
        <input
          id="title"
          name="title"
          required
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          說明(選填)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="quota" className="text-sm font-medium">
          名額
        </label>
        <input
          id="quota"
          name="quota"
          type="number"
          min={1}
          defaultValue={1}
          required
          className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="signupOpensAt" className="text-sm font-medium">
            報名開放時間
          </label>
          <input
            id="signupOpensAt"
            name="signupOpensAt"
            type="datetime-local"
            required
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="signupClosesAt" className="text-sm font-medium">
            報名截止時間
          </label>
          <input
            id="signupClosesAt"
            name="signupClosesAt"
            type="datetime-local"
            required
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="submissionDeadline" className="text-sm font-medium">
            繳件期限(選填)
          </label>
          <input
            id="submissionDeadline"
            name="submissionDeadline"
            type="datetime-local"
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="allowMultipleEntriesPerAccount" />
        允許同一個帳號報名多個角色
      </label>

      <EventEligibilityRulesFields fields={fields} rules={rules} onChange={setRules} />

      {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}
      {state && "fieldErrors" in state && (
        <p className="text-sm text-danger">{Object.values(state.fieldErrors).flat()[0]}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "發布中…" : "發布公告"}
      </button>
    </form>
  );
}
