import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { NewStepForm } from "./NewStepForm";

export default async function NewStepPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/story/chapters/[chapterId]/steps/new">) {
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
    .select("id, title")
    .eq("id", chapterId)
    .eq("world_id", world.id)
    .maybeSingle();
  if (!chapter) notFound();

  const { data: characterNodes } = await supabase
    .from("nodes")
    .select("id, title")
    .eq("world_id", world.id)
    .eq("node_type", "character")
    .order("title");

  return (
    <div>
      <Link
        href={`/dashboard/worlds/${world.slug}/story/chapters/${chapter.id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回「{chapter.title}」
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">新增段落</h1>
      <NewStepForm
        chapterId={chapter.id}
        worldSlug={world.slug}
        characterOptions={characterNodes ?? []}
      />
    </div>
  );
}
