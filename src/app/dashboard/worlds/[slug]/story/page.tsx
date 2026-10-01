import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { EmptyState } from "@/components/EmptyState";

/**
 * 「角色時間軸」(story_chapters, scope='character')已經收掉——角色自己
 * 的時間軸現在回到角色節點頁面的 character_timeline_events(「時間軸」
 * 分頁),這裡只保留世界觀共用的「企劃時間軸」(scope='official')。
 * 舊的 scope='character' 章節資料不處理,也不再有入口連過去。
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

  const { data: chapters } = await supabase
    .from("story_chapters")
    .select("id, title, description, order_index")
    .eq("world_id", world.id)
    .eq("scope", "official")
    .order("order_index");

  const newChapterHref = `/dashboard/worlds/${world.slug}/story/chapters/new`;

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

      {(chapters ?? []).length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="目前還沒有章節"
            description="新增第一個章節,開始記錄這條時間軸的故事。"
            actionHref={isStaff ? newChapterHref : undefined}
            actionLabel={isStaff ? "+ 新增章節" : undefined}
          />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {(chapters ?? []).map((chapter) => (
            <li key={chapter.id}>
              <Link
                href={`/dashboard/worlds/${world.slug}/story/chapters/${chapter.id}`}
                className="block py-3 hover:underline"
              >
                <span className="text-xs text-muted-foreground">
                  #{chapter.order_index}
                </span>{" "}
                {chapter.title}
                {chapter.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {chapter.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
