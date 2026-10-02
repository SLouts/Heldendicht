import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { EmptyState } from "@/components/EmptyState";
import { WorldStoryTimeline } from "@/components/WorldStoryTimeline";
import {
  fetchOfficialChapters,
  fetchWorldCharacterTimelineEvents,
  fetchWorldStoryTimelineRange,
} from "@/lib/storyTimeline";

/**
 * 公開版故事時間軸,唯讀——沒有「+ 新增章節」,可見度交給
 * story_chapters_select RLS(can_view_world_content),不另外收斂。
 *
 * 「角色時間軸」(scope='character')已經收掉,角色自己的時間軸回到
 * 角色節點頁面的 character_timeline_events,這裡只剩「企劃時間軸」
 * (scope='official')。章節照年份橫向排列,角色自己時間軸上填了
 * 「世界觀年份」的時間點也會一起混進同一條軸線——見 WorldStoryTimeline。
 */
export default async function PublicStoryPage({
  params,
}: PageProps<"/worlds/[slug]/story">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const [chapters, characterEvents, timelineRange] = await Promise.all([
    fetchOfficialChapters(supabase, world.id),
    fetchWorldCharacterTimelineEvents(supabase, world.id),
    fetchWorldStoryTimelineRange(supabase, world.id),
  ]);

  const chapterItems = chapters.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    yearStart: c.year_start,
    yearStartMonth: c.year_start_month,
    yearStartDay: c.year_start_day,
    yearEnd: c.year_end,
    yearEndMonth: c.year_end_month,
    yearEndDay: c.year_end_day,
    href: `/worlds/${world.slug}/story/chapters/${c.id}`,
  }));
  const characterEventItems = characterEvents.map((e) => ({
    id: e.id,
    label: e.label,
    description: e.description,
    isSpoiler: e.is_spoiler,
    worldYear: e.world_year,
    worldYearMonth: e.world_year_month,
    worldYearDay: e.world_year_day,
    characterTitle: e.character_title,
    href: `/worlds/${world.slug}/nodes/${e.character_slug}`,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <WorldMainTabs basePath={`/worlds/${world.slug}`} />

      <h2 className="mt-6 text-lg font-semibold">章節</h2>

      {chapterItems.length === 0 && characterEventItems.length === 0 && !timelineRange ? (
        <div className="mt-3">
          <EmptyState title="目前還沒有章節" description="主辦還沒有在這條時間軸上寫下章節。" />
        </div>
      ) : (
        <div className="mt-4">
          <WorldStoryTimeline
            chapters={chapterItems}
            characterEvents={characterEventItems}
            yearRange={timelineRange}
          />
        </div>
      )}
    </div>
  );
}
