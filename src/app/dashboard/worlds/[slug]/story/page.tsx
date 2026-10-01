import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { EmptyState } from "@/components/EmptyState";
import { WorldStoryTimeline } from "@/components/WorldStoryTimeline";
import {
  fetchOfficialChapters,
  fetchWorldCharacterTimelineEvents,
} from "@/lib/storyTimeline";

/**
 * 「角色時間軸」(story_chapters, scope='character')已經收掉——角色自己
 * 的時間軸現在回到角色節點頁面的 character_timeline_events(「時間軸」
 * 分頁),這裡只保留世界觀共用的「企劃時間軸」(scope='official')。
 * 舊的 scope='character' 章節資料不處理,也不再有入口連過去。
 *
 * 章節照年份(year_start/year_end)橫向排列,角色自己時間軸上填了
 * 「世界觀年份」的時間點也會一起混進同一條軸線——見 WorldStoryTimeline。
 */
export default async function StoryPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/story">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: isStaff } = await supabase.rpc("is_world_staff", {
    p_world_id: world.id,
  });

  const [chapters, characterEvents] = await Promise.all([
    fetchOfficialChapters(supabase, world.id),
    fetchWorldCharacterTimelineEvents(supabase, world.id),
  ]);

  const newChapterHref = `/dashboard/worlds/${world.slug}/story/chapters/new`;

  const chapterItems = chapters.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    yearStart: c.year_start,
    yearEnd: c.year_end,
    href: `/dashboard/worlds/${world.slug}/story/chapters/${c.id}`,
  }));
  const characterEventItems = characterEvents.map((e) => ({
    id: e.id,
    label: e.label,
    description: e.description,
    isSpoiler: e.is_spoiler,
    worldYear: e.world_year,
    characterTitle: e.character_title,
    href: `/dashboard/worlds/${world.slug}/nodes/${e.character_slug}`,
  }));

  return (
    <div>
      <WorldMainTabs
        basePath={`/dashboard/worlds/${world.slug}`}
        showAdminTab={Boolean(isStaff)}
      />

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">章節</h2>
        {isStaff && (
          <Link href={newChapterHref} className="text-sm underline">
            + 新增章節
          </Link>
        )}
      </div>

      {chapterItems.length === 0 && characterEventItems.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="目前還沒有章節"
            description="新增第一個章節,開始記錄這條時間軸的故事。"
            actionHref={isStaff ? newChapterHref : undefined}
            actionLabel={isStaff ? "+ 新增章節" : undefined}
          />
        </div>
      ) : (
        <div className="mt-4">
          <WorldStoryTimeline chapters={chapterItems} characterEvents={characterEventItems} />
        </div>
      )}
    </div>
  );
}
