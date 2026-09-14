import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { NewChapterForm } from "./NewChapterForm";

export default async function NewChapterPage({
  params,
  searchParams,
}: PageProps<"/dashboard/worlds/[slug]/story/chapters/new">) {
  const { slug } = await params;
  const sp = await searchParams;
  const scope = sp.scope === "character" ? "character" : "official";
  const characterId = typeof sp.characterId === "string" ? sp.characterId : "";
  const user = await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const backHref = `/dashboard/worlds/${world.slug}/story?tab=${scope}${
    scope === "character" && characterId ? `&characterId=${characterId}` : ""
  }`;

  if (scope === "official") {
    const { data: isStaff } = await supabase.rpc("is_world_staff", {
      p_world_id: world.id,
    });
    if (!isStaff) {
      return (
        <div>
          <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
            ← 返回時間軸
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            只有這個世界觀的主辦/編輯者能新增企劃時間軸的章節。
          </p>
        </div>
      );
    }

    return (
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
          ← 返回時間軸
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">新增企劃章節</h1>
        <NewChapterForm
          worldId={world.id}
          worldSlug={world.slug}
          scope="official"
          characterId=""
        />
      </div>
    );
  }

  // scope === "character"
  const { data: characterNode } = await supabase
    .from("nodes")
    .select("id, title, characters(owner_id)")
    .eq("world_id", world.id)
    .eq("id", characterId)
    .maybeSingle();
  if (!characterNode) notFound();

  const character = Array.isArray(characterNode.characters)
    ? characterNode.characters[0]
    : characterNode.characters;

  const { data: isStaff } = await supabase.rpc("is_world_staff", {
    p_world_id: world.id,
  });
  const isOwner = character?.owner_id === user.id;

  if (!isOwner && !isStaff) {
    return (
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
          ← 返回時間軸
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          只有「{characterNode.title}」的擁有者或世界觀 staff 能新增這個角色的時間軸。
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
        ← 返回時間軸
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        新增「{characterNode.title}」的時間軸章節
      </h1>
      <NewChapterForm
        worldId={world.id}
        worldSlug={world.slug}
        scope="character"
        characterId={characterNode.id}
        characterTitle={characterNode.title}
      />
    </div>
  );
}
