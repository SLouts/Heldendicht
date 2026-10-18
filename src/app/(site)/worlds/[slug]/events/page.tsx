import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { formatTaipeiDateTime } from "@/lib/taipeiTime";
import { eventPhase, EVENT_PHASE_LABELS } from "@/lib/worldEvents";

export async function generateMetadata({
  params,
}: PageProps<"/worlds/[slug]/events">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: world } = await supabase.from("worlds").select("name").eq("slug", slug).maybeSingle();
  if (!world) return {};
  return { title: `活動報名 ｜ ${world.name}` };
}

/**
 * 公開版活動報名列表,唯讀——報名/編輯/抽籤都只在後台版
 * (dashboard/worlds/[slug]/events)才有表單,可見度交給
 * world_events_select RLS,不另外收斂。
 */
export default async function PublicWorldEventsPage({
  params,
}: PageProps<"/worlds/[slug]/events">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: events } = await supabase
    .from("world_events")
    .select("id, title, quota, signup_opens_at, signup_closes_at, drawn_at")
    .eq("world_id", world.id)
    .order("signup_opens_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
      <WorldMainTabs basePath={`/worlds/${world.slug}`} />

      <h1 className="mt-4 text-xl font-semibold">活動報名</h1>

      <div className="mt-4 flex flex-col gap-2">
        {(events ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/worlds/${world.slug}/events/${e.id}`}
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
