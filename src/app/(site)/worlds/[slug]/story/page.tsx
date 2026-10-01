import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { EmptyState } from "@/components/EmptyState";

/**
 * 公開版故事時間軸,唯讀——沒有「+ 新增章節」,可見度交給
 * story_chapters_select RLS(can_view_world_content),不另外收斂。
 *
 * 「角色時間軸」(scope='character')已經收掉,角色自己的時間軸回到
 * 角色節點頁面的 character_timeline_events,這裡只剩「企劃時間軸」
 * (scope='official')。
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

  const { data: chapters } = await supabase
    .from("story_chapters")
    .select("id, title, description, order_index")
    .eq("world_id", world.id)
    .eq("scope", "official")
    .order("order_index");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <WorldMainTabs basePath={`/worlds/${world.slug}`} />

      <h2 className="mt-6 text-lg font-semibold">章節</h2>

      {(chapters ?? []).length === 0 ? (
        <div className="mt-3">
          <EmptyState title="目前還沒有章節" description="主辦還沒有在這條時間軸上寫下章節。" />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {(chapters ?? []).map((chapter) => (
            <li key={chapter.id}>
              <Link
                href={`/worlds/${world.slug}/story/chapters/${chapter.id}`}
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
