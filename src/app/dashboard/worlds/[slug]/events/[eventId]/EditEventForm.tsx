"use client";

import { useActionState, useState } from "react";
import { updateEvent } from "@/lib/actions/events";
import { toTaipeiDatetimeLocalValue } from "@/lib/taipeiTime";
import {
  EventEligibilityRulesFields,
  type FieldRuleGroup,
  type FieldOption,
} from "../EventEligibilityRulesFields";

export function EditEventForm({
  eventId,
  worldSlug,
  title,
  description,
  quota,
  signupOpensAt,
  signupClosesAt,
  submissionDeadline,
  allowMultipleEntriesPerAccount,
  fields,
  initialRules,
}: {
  eventId: string;
  worldSlug: string;
  title: string;
  description: string;
  quota: number;
  signupOpensAt: string;
  signupClosesAt: string;
  submissionDeadline: string | null;
  allowMultipleEntriesPerAccount: boolean;
  fields: FieldOption[];
  initialRules: FieldRuleGroup[];
}) {
  const [state, formAction, pending] = useActionState(updateEvent, undefined);
  const [rules, setRules] = useState<FieldRuleGroup[]>(initialRules);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <p className="text-sm font-medium">編輯公告</p>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-title" className="text-sm font-medium">
          公告標題
        </label>
        <input
          id="edit-title"
          name="title"
          defaultValue={title}
          required
          className="rounded-lg border border-border bg-background px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-description" className="text-sm font-medium">
          說明(選填)
        </label>
        <textarea
          id="edit-description"
          name="description"
          rows={3}
          defaultValue={description}
          className="rounded-lg border border-border bg-background px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-quota" className="text-sm font-medium">
          名額
        </label>
        <input
          id="edit-quota"
          name="quota"
          type="number"
          min={1}
          defaultValue={quota}
          required
          className="w-24 rounded-lg border border-border bg-background px-3 py-2"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-opens" className="text-sm font-medium">
            報名開放時間
          </label>
          <input
            id="edit-opens"
            name="signupOpensAt"
            type="datetime-local"
            defaultValue={toTaipeiDatetimeLocalValue(signupOpensAt)}
            required
            className="rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-closes" className="text-sm font-medium">
            報名截止時間
          </label>
          <input
            id="edit-closes"
            name="signupClosesAt"
            type="datetime-local"
            defaultValue={toTaipeiDatetimeLocalValue(signupClosesAt)}
            required
            className="rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-deadline" className="text-sm font-medium">
            繳件期限(選填)
          </label>
          <input
            id="edit-deadline"
            name="submissionDeadline"
            type="datetime-local"
            defaultValue={submissionDeadline ? toTaipeiDatetimeLocalValue(submissionDeadline) : ""}
            className="rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="allowMultipleEntriesPerAccount"
          defaultChecked={allowMultipleEntriesPerAccount}
        />
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
        {pending ? "儲存中…" : "儲存公告"}
      </button>
    </form>
  );
}
