import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { formatTaipeiDateTime } from "@/lib/taipeiTime";
import { eventPhase, EVENT_PHASE_LABELS } from "@/lib/worldEvents";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/worlds/[slug]/events">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: world } = await supabase.from("worlds").select("name").eq("slug", slug).maybeSingle();
  if (!world) return {};
  return { title: `活動報名 ｜ ${world.name}` };
}

export default async function WorldEventsPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/events">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const [{ data: isStaff }, { data: events }] = await Promise.all([
    supabase.rpc("is_world_staff", { p_world_id: world.id }),
    supabase
      .from("world_events")
      .select("id, title, quota, signup_opens_at, signup_closes_at, drawn_at")
      .eq("world_id", world.id)
      .order("signup_opens_at", { ascending: false }),
  ]);

  return (
    <div>
      <WorldMainTabs basePath={`/dashboard/worlds/${world.slug}`} />

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">活動報名</h1>
        {isStaff && (
          <Link
            href={`/dashboard/worlds/${world.slug}/events/new`}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover"
          >
            + 發公告
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {(events ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/dashboard/worlds/${world.slug}/events/${e.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3 hover:bg-muted"
          >
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-sm text-muted-foreground">
                名額 {e.quota} ‧ 報名時間 {formatTaipeiDateTime(e.signup_opens_at)} ~{" "}
                {formatTaipeiDateTime(e.signup_closes_at)}
              </p>
            </div>
            <span className="rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg">
              {EVENT_PHASE_LABELS[eventPhase(e)]}
            </span>
          </Link>
        ))}
        {(events ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">目前還沒有公告。</p>
        )}
      </div>
    </div>
  );
}
