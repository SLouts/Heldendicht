import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { deleteChapter } from "@/lib/actions/story";
import { EditChapterForm } from "./EditChapterForm";
import { StepEditForm } from "./StepEditForm";

export default async function ChapterDetailPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/story/chapters/[chapterId]">) {
  const { slug, chapterId } = await params;
  await requireUser();
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
      "id, scope, character_id, title, description, order_index, character:nodes!story_chapters_character_id_fkey(id, title)",
    )
    .eq("id", chapterId)
    .eq("world_id", world.id)
    .maybeSingle();
  if (!chapter) notFound();

  const character = Array.isArray(chapter.character)
    ? chapter.character[0]
    : chapter.character;

  const [{ data: isStaff }, { data: owns }, { data: steps }, { data: characterNodes }] =
    await Promise.all([
      supabase.rpc("is_world_staff", { p_world_id: world.id }),
      chapter.scope === "character" && chapter.character_id
        ? supabase.rpc("owns_character", { p_character_node_id: chapter.character_id })
        : Promise.resolve({ data: false }),
      supabase
        .from("story_steps")
        .select(
          "id, order_index, custom_text, pov_character_id, node:nodes!story_steps_node_id_fkey(id, title, slug), pov:nodes!story_steps_pov_character_id_fkey(title)",
        )
        .eq("chapter_id", chapterId)
        .order("order_index"),
      supabase
        .from("nodes")
        .select("id, title")
        .eq("world_id", world.id)
        .eq("node_type", "character")
        .order("title"),
    ]);

  const canManage = Boolean(isStaff) || Boolean(owns);
  const backHref = `/dashboard/worlds/${world.slug}/story?tab=${chapter.scope}${
    chapter.scope === "character" ? `&characterId=${chapter.character_id}` : ""
  }`;

  return (
    <div className="max-w-2xl">
      <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
        ← 返回時間軸
      </Link>

      <div className="mt-2 flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{chapter.title}</h1>
        <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
          {chapter.scope === "official" ? "企劃時間軸" : `${character?.title ?? ""} 的時間軸`}
        </span>
      </div>
      {chapter.description && (
        <p className="mt-1 text-sm text-muted-foreground">{chapter.description}</p>
      )}

      {canManage && (
        <EditChapterForm
          chapterId={chapter.id}
          worldSlug={world.slug}
          title={chapter.title}
          description={chapter.description ?? ""}
          orderIndex={chapter.order_index}
        />
      )}

      {canManage && (
        <form
          action={deleteChapter.bind(null, chapter.id, world.slug)}
          className="mt-4"
        >
          <button className="text-sm text-danger underline">
            刪除這條時間軸章節
          </button>
        </form>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">段落</h2>
        {canManage && (
          <Link
            href={`/dashboard/worlds/${world.slug}/story/chapters/${chapter.id}/steps/new`}
            className="text-sm underline"
          >
            + 新增段落
          </Link>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {steps?.map((step) => {
          const node = Array.isArray(step.node) ? step.node[0] : step.node;
          const pov = Array.isArray(step.pov) ? step.pov[0] : step.pov;

          if (!canManage) {
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
                      href={`/dashboard/worlds/${world.slug}/nodes/${node.slug}`}
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
          }

          return (
            <div key={step.id}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {node && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/nodes/${node.slug}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {node.title}
                  </Link>
                )}
              </div>
              <StepEditForm
                stepId={step.id}
                chapterId={chapter.id}
                worldSlug={world.slug}
                orderIndex={step.order_index}
                customText={step.custom_text ?? ""}
                povCharacterId={step.pov_character_id ?? ""}
                characterOptions={characterNodes ?? []}
              />
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
