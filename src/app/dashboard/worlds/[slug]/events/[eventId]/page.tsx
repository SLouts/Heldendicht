import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { formatTaipeiDateTime } from "@/lib/taipeiTime";
import {
  eventPhase,
  EVENT_PHASE_LABELS,
  EVENT_ENTRY_STATUS_LABELS,
  isPastDeadline,
  groupEligibilityRules,
} from "@/lib/worldEvents";
import { deleteEvent, drawEventWinners, withdrawEventEntry } from "@/lib/actions/events";
import { EditEventForm } from "./EditEventForm";
import { EventSignupForm } from "./EventSignupForm";
import { EventSubmissionForm } from "./EventSubmissionForm";
import type { FieldOption } from "../EventEligibilityRulesFields";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/worlds/[slug]/events/[eventId]">): Promise<Metadata> {
  const { slug, eventId } = await params;
  const supabase = await createClient();
  const { data: world } = await supabase.from("worlds").select("name").eq("slug", slug).maybeSingle();
  if (!world) return {};
  const { data: event } = await supabase
    .from("world_events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return {};
  return { title: `${event.title} ｜ ${world.name}` };
}

export default async function EventDetailPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/events/[eventId]">) {
  const { slug, eventId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: event } = await supabase
    .from("world_events")
    .select(
      "id, title, description, quota, signup_opens_at, signup_closes_at, submission_deadline, allow_multiple_entries_per_account, drawn_at",
    )
    .eq("id", eventId)
    .eq("world_id", world.id)
    .maybeSingle();
  if (!event) notFound();

  const [{ data: isStaff }, { data: rules }, { data: myCharacterRows }, { data: myEntries }] =
    await Promise.all([
      supabase.rpc("is_world_staff", { p_world_id: world.id }),
      supabase
        .from("world_event_eligibility_rules")
        .select("id, field_id, required_value, field:world_character_fields(label)")
        .eq("event_id", event.id),
      supabase
        .from("characters")
        .select("node_id, nodes(id, title, world_id)")
        .eq("owner_id", user.id)
        .eq("character_type", "pc"),
      supabase
        .from("world_event_entries")
        .select("id, character_node_id, status, submission_content, submitted_at, node:nodes(title)")
        .eq("event_id", event.id)
        .eq("account_id", user.id),
    ]);

  const phase = eventPhase(event);

  const enteredCharacterIds = new Set((myEntries ?? []).map((e) => e.character_node_id));
  const eligibleCharacters = (myCharacterRows ?? [])
    .map((c) => unwrapRelation(c.nodes))
    .filter((n): n is { id: string; title: string; world_id: string } => n != null)
    .filter((n) => n.world_id === world.id)
    .filter((n) => event.allow_multiple_entries_per_account || !enteredCharacterIds.has(n.id));

  const canSignUp =
    phase === "open" &&
    (event.allow_multiple_entries_per_account || (myEntries ?? []).length === 0) &&
    eligibleCharacters.length > 0;

  let fields: FieldOption[] = [];
  let staffEntries: Array<{
    id: string;
    status: string;
    submission_content: string;
    submitted_at: string | null;
    node: { title: string } | null | undefined;
    account: { username: string | null; display_name: string | null } | null | undefined;
  }> = [];
  if (isStaff) {
    const [{ data: fieldRows }, { data: entryRows }] = await Promise.all([
      supabase
        .from("world_character_fields")
        .select("id, label, field_type, options, character_type")
        .eq("world_id", world.id)
        .or("character_type.is.null,character_type.eq.pc")
        .order("order_index"),
      supabase
        .from("world_event_entries")
        .select(
          "id, status, submission_content, submitted_at, node:nodes(title), account:profiles(username, display_name)",
        )
        .eq("event_id", event.id)
        .order("created_at"),
    ]);
    fields = fieldRows ?? [];
    staffEntries = (entryRows ?? []).map((e) => ({
      ...e,
      node: unwrapRelation(e.node),
      account: unwrapRelation(e.account),
    }));
  }

  let publicWinners: Array<{ id: string; title: string }> = [];
  if (phase === "drawn" && !isStaff) {
    const { data } = await supabase
      .from("world_event_entries")
      .select("id, node:nodes(title)")
      .eq("event_id", event.id)
      .eq("status", "drawn");
    publicWinners = (data ?? []).map((e) => ({
      id: e.id,
      title: unwrapRelation(e.node)?.title ?? "",
    }));
  }

  return (
    <div>
      <WorldMainTabs basePath={`/dashboard/worlds/${world.slug}`} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{event.title}</h1>
        <span className="rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg">
          {EVENT_PHASE_LABELS[phase]}
        </span>
      </div>

      {event.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {event.description}
        </p>
      )}

      <dl className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
        <div>名額:{event.quota}</div>
        <div>
          報名時間:{formatTaipeiDateTime(event.signup_opens_at)} ~{" "}
          {formatTaipeiDateTime(event.signup_closes_at)}
        </div>
        {event.submission_deadline && (
          <div>繳件期限:{formatTaipeiDateTime(event.submission_deadline)}</div>
        )}
        <div>
          {event.allow_multiple_entries_per_account
            ? "同一帳號可以報名多個角色"
            : "同一帳號限報名一個角色"}
        </div>
      </dl>

      {(rules ?? []).length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium">報名資格:</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
            {Array.from(groupEligibilityRules(rules ?? [])).map(([fieldId, values]) => {
              const field = unwrapRelation(
                (rules ?? []).find((r) => r.field_id === fieldId)?.field,
              );
              return (
                <li key={fieldId}>
                  {field?.label ?? "(欄位已刪除)"} = {values.join("、")}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isStaff && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-4">
          <EditEventForm
            eventId={event.id}
            worldSlug={world.slug}
            title={event.title}
            description={event.description}
            quota={event.quota}
            signupOpensAt={event.signup_opens_at}
            signupClosesAt={event.signup_closes_at}
            submissionDeadline={event.submission_deadline}
            allowMultipleEntriesPerAccount={event.allow_multiple_entries_per_account}
            fields={fields}
            initialRules={Array.from(groupEligibilityRules(rules ?? []), ([fieldId, requiredValues]) => ({
              fieldId,
              requiredValues,
            }))}
          />
          <form action={deleteEvent.bind(null, event.id, world.slug)} className="mt-4">
            <button type="submit" className="text-sm text-danger underline">
              刪除這個公告
            </button>
          </form>
        </div>
      )}

      {canSignUp && (
        <EventSignupForm eventId={event.id} worldSlug={world.slug} characters={eligibleCharacters} />
      )}

      {(myEntries ?? []).length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">我的報名</h2>
          <div className="mt-3 flex flex-col gap-3">
            {(myEntries ?? []).map((e) => {
              const node = unwrapRelation(e.node);
              return (
                <div key={e.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{node?.title ?? "(角色已刪除)"}</p>
                    <span className="text-sm text-muted-foreground">
                      {EVENT_ENTRY_STATUS_LABELS[e.status as keyof typeof EVENT_ENTRY_STATUS_LABELS]}
                    </span>
                  </div>
                  {e.status === "pending" && phase === "open" && (
                    <form
                      action={withdrawEventEntry.bind(null, e.id, event.id, world.slug)}
                      className="mt-2"
                    >
                      <button type="submit" className="text-sm text-danger underline">
                        撤回報名
                      </button>
                    </form>
                  )}
                  {e.status === "drawn" && (
                    <EventSubmissionForm
                      entryId={e.id}
                      eventId={event.id}
                      worldSlug={world.slug}
                      content={e.submission_content}
                      submittedAt={e.submitted_at}
                      submissionDeadline={event.submission_deadline}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {phase === "drawn" && !isStaff && publicWinners.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">中籤名單</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {publicWinners.map((w) => (
              <li key={w.id}>{w.title}</li>
            ))}
          </ul>
        </div>
      )}

      {isStaff && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">報名名單({staffEntries.length})</h2>
            {phase === "awaiting_draw" && (
              <form action={drawEventWinners.bind(null, event.id, world.slug)}>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover"
                >
                  開始抽籤
                </button>
              </form>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {staffEntries.map((e) => {
              const isOverdue =
                e.status === "drawn" &&
                !e.submission_content &&
                isPastDeadline(event.submission_deadline);
              const submittedLate =
                e.submitted_at != null &&
                event.submission_deadline != null &&
                new Date(e.submitted_at).getTime() > new Date(event.submission_deadline).getTime();
              return (
                <div key={e.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{e.node?.title ?? "(角色已刪除)"}</span>
                    <span className="text-muted-foreground">
                      {e.account?.display_name ?? e.account?.username ?? ""}
                    </span>
                    <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
                      {EVENT_ENTRY_STATUS_LABELS[e.status as keyof typeof EVENT_ENTRY_STATUS_LABELS]}
                    </span>
                  </div>
                  {e.status === "drawn" && (
                    <div className="mt-2 text-muted-foreground">
                      {e.submission_content ? (
                        <>
                          <p className="whitespace-pre-wrap">{e.submission_content}</p>
                          {e.submitted_at && (
                            <p className="mt-1 text-xs">
                              繳交於 {formatTaipeiDateTime(e.submitted_at)}
                              {submittedLate && "(逾期)"}
                            </p>
                          )}
                        </>
                      ) : (
                        <p>尚未繳件{isOverdue && "(已逾期,請提醒)"}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {staffEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">還沒有人報名。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
