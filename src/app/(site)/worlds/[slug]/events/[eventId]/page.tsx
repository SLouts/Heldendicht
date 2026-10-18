import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { formatTaipeiDateTime } from "@/lib/taipeiTime";
import { eventPhase, EVENT_PHASE_LABELS } from "@/lib/worldEvents";

export async function generateMetadata({
  params,
}: PageProps<"/worlds/[slug]/events/[eventId]">): Promise<Metadata> {
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

/**
 * 公開版活動詳細頁,唯讀——報名表單、編輯、抽籤都只在後台版才有,
 * 邏輯比照公開版章節詳細頁(story/chapters/[chapterId]/page.tsx)同慣例。
 */
export default async function PublicEventDetailPage({
  params,
}: PageProps<"/worlds/[slug]/events/[eventId]">) {
  const { slug, eventId } = await params;
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

  const { data: rules } = await supabase
    .from("world_event_eligibility_rules")
    .select("id, required_value, field:world_character_fields(label)")
    .eq("event_id", event.id);

  const phase = eventPhase(event);

  let winners: Array<{ id: string; title: string }> = [];
  if (phase === "drawn") {
    const { data } = await supabase
      .from("world_event_entries")
      .select("id, node:nodes(title)")
      .eq("event_id", event.id)
      .eq("status", "drawn");
    winners = (data ?? []).map((e) => ({ id: e.id, title: unwrapRelation(e.node)?.title ?? "" }));
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
      <WorldMainTabs basePath={`/worlds/${world.slug}`} />

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
            {(rules ?? []).map((r) => {
              const field = unwrapRelation(r.field);
              return (
                <li key={r.id}>
                  {field?.label ?? "(欄位已刪除)"} = {r.required_value}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-4 text-sm text-muted-foreground">
        要報名請先登入,到後台的「活動報名」分頁操作。
      </p>

      {phase === "drawn" && winners.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">中籤名單</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {winners.map((w) => (
              <li key={w.id}>{w.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
