import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 公開版章節詳細頁,唯讀——沒有編輯/刪除/新增段落,可見度交給
 * story_chapters_select/story_steps_select RLS,不另外收斂。
 */
export default async function PublicChapterDetailPage({
  params,
}: PageProps<"/worlds/[slug]/story/chapters/[chapterId]">) {
  const { slug, chapterId } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: chapter } = await supabase
    .from("story_chapters")
    .select(
      "id, scope, character_id, title, description, character:nodes!story_chapters_character_id_fkey(title)",
    )
    .eq("id", chapterId)
    .eq("world_id", world.id)
    .maybeSingle();
  if (!chapter) notFound();

  const character = Array.isArray(chapter.character)
    ? chapter.character[0]
    : chapter.character;

  const { data: steps } = await supabase
    .from("story_steps")
    .select(
      "id, order_index, custom_text, node:nodes!story_steps_node_id_fkey(title, slug), pov:nodes!story_steps_pov_character_id_fkey(title)",
    )
    .eq("chapter_id", chapterId)
    .order("order_index");

  const backHref = `/worlds/${world.slug}/story?tab=${chapter.scope}${
    chapter.scope === "character" ? `&characterId=${chapter.character_id}` : ""
  }`;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
        ← 返回時間軸
      </Link>

      <div className="mt-2 flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{chapter.title}</h1>
        <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
          {chapter.scope === "official" ? "企劃時間軸" : `${character?.title ?? ""} 的時間軸`}
        </span>
      </div>

      <h2 className="mt-8 text-lg font-semibold">段落</h2>
      <div className="mt-3 flex flex-col gap-3">
        {steps?.map((step) => {
          const node = Array.isArray(step.node) ? step.node[0] : step.node;
          const pov = Array.isArray(step.pov) ? step.pov[0] : step.pov;
          return (
            <div
              key={step.id}
              className="rounded-lg border border-border bg-surface p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  #{step.order_index}
                </span>
                {node && (
                  <Link
                    href={`/worlds/${world.slug}/nodes/${node.slug}`}
                    className="font-medium hover:underline"
                  >
                    {node.title}
                  </Link>
                )}
                {pov && (
                  <span className="text-xs text-muted-foreground">
                    · {pov.title} 視角
                  </span>
                )}
              </div>
              {step.custom_text && (
                <p className="mt-1 whitespace-pre-wrap">{step.custom_text}</p>
              )}
            </div>
          );
        })}
        {steps?.length === 0 && (
          <p className="text-sm text-muted-foreground">這個章節還沒有段落。</p>
        )}
      </div>
    </div>
  );
}
