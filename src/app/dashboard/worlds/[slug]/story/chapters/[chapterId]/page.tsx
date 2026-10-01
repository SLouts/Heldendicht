import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { deleteChapter } from "@/lib/actions/story";
import { EditChapterForm } from "./EditChapterForm";
import { StepEditForm } from "./StepEditForm";
import { StepContent } from "./StepContent";
import { unwrapRelation } from "@/lib/unwrapRelation";

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

  // migration 034 套用前 story_chapters 還沒有 year_start/year_end,select
  // 會直接失敗——接住那個失敗,退回不含這兩欄的查詢,讓章節詳細頁在套用
  // migration 之前還能正常開啟,只是編輯表單暫時看不到年份欄位。
  const chapterWithYears = await supabase
    .from("story_chapters")
    .select(
      "id, scope, character_id, title, description, order_index, year_start, year_end, character:nodes!story_chapters_character_id_fkey(id, title)",
    )
    .eq("id", chapterId)
    .eq("world_id", world.id)
    .maybeSingle();
  const chapter = chapterWithYears.error
    ? await supabase
        .from("story_chapters")
        .select(
          "id, scope, character_id, title, description, order_index, character:nodes!story_chapters_character_id_fkey(id, title)",
        )
        .eq("id", chapterId)
        .eq("world_id", world.id)
        .maybeSingle()
        .then((r) => (r.data ? { ...r.data, year_start: null, year_end: null } : null))
    : chapterWithYears.data;
  if (!chapter) notFound();

  const character = unwrapRelation(chapter.character);

  const [
    { data: isStaff },
    { data: owns },
    { data: steps },
    { data: characterNodes },
    { data: worldNodes },
  ] = await Promise.all([
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
    supabase
      .from("nodes")
      .select("title, slug, is_placeholder")
      .eq("world_id", world.id),
  ]);

  const canManage = Boolean(isStaff) || Boolean(owns);
  // [[節點名稱]] 用世界觀內所有節點的標題比對,查不到就原樣顯示——段落
  // 文字比較隨手,不像 nodes.content 那樣自動建立佔位節點。
  const stepLinkMap = new Map(
    (worldNodes ?? []).map((n) => [n.title, { slug: n.slug, isPlaceholder: n.is_placeholder }]),
  );
  // story 列表頁已經收掉 scope='character' 的分頁跟入口,這裡統一導回
  // 企劃時間軸列表——舊的角色章節仍可透過這個詳細頁直接檢視,只是不再
  // 有入口連過去。
  const backHref = `/dashboard/worlds/${world.slug}/story`;

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

      {canManage && (
        <EditChapterForm
          chapterId={chapter.id}
          worldSlug={world.slug}
          title={chapter.title}
          description={chapter.description ?? ""}
          yearStart={chapter.year_start}
          yearEnd={chapter.year_end}
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
          const node = unwrapRelation(step.node);
          const pov = unwrapRelation(step.pov);

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
                  <StepContent
                    content={step.custom_text}
                    basePath={`/dashboard/worlds/${world.slug}/nodes`}
                    links={stepLinkMap}
                  />
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
