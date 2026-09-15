import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type CharacterOption = { id: string; title: string };

/**
 * 公開版故事時間軸,唯讀——沒有「+ 新增章節」,可見度交給
 * story_chapters_select RLS(can_view_world_content),不另外收斂。
 */
export default async function PublicStoryPage({
  params,
  searchParams,
}: PageProps<"/worlds/[slug]/story">) {
  const { slug } = await params;
  const sp = await searchParams;
  const tab = sp.tab === "character" ? "character" : "official";
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: characterNodes } = await supabase
    .from("nodes")
    .select("id, title, characters(character_type)")
    .eq("world_id", world.id)
    .eq("node_type", "character")
    .order("title");

  const pcOptions: CharacterOption[] = (characterNodes ?? [])
    .map((n) => {
      const c = Array.isArray(n.characters) ? n.characters[0] : n.characters;
      return c?.character_type === "pc" ? { id: n.id, title: n.title } : null;
    })
    .filter((n): n is CharacterOption => n !== null);

  const selectedCharacterId =
    typeof sp.characterId === "string" ? sp.characterId : (pcOptions[0]?.id ?? null);
  const selectedCharacter = pcOptions.find((c) => c.id === selectedCharacterId);

  let chapters: {
    id: string;
    title: string;
    description: string | null;
    order_index: number;
  }[] = [];

  if (tab === "official") {
    const { data } = await supabase
      .from("story_chapters")
      .select("id, title, description, order_index")
      .eq("world_id", world.id)
      .eq("scope", "official")
      .order("order_index");
    chapters = data ?? [];
  } else if (selectedCharacterId) {
    const { data } = await supabase
      .from("story_chapters")
      .select("id, title, description, order_index")
      .eq("world_id", world.id)
      .eq("scope", "character")
      .eq("character_id", selectedCharacterId)
      .order("order_index");
    chapters = data ?? [];
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link
        href={`/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{world.name} 的故事時間軸</h1>

      <div className="mt-4 flex gap-2 border-b border-border">
        <Link
          href={`/worlds/${world.slug}/story?tab=official`}
          className={
            "px-3 py-2 text-sm " +
            (tab === "official"
              ? "border-b-2 border-primary font-medium"
              : "text-muted-foreground")
          }
        >
          企劃時間軸
        </Link>
        <Link
          href={`/worlds/${world.slug}/story?tab=character${
            selectedCharacterId ? `&characterId=${selectedCharacterId}` : ""
          }`}
          className={
            "px-3 py-2 text-sm " +
            (tab === "character"
              ? "border-b-2 border-primary font-medium"
              : "text-muted-foreground")
          }
        >
          角色時間軸
        </Link>
      </div>

      {tab === "character" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {pcOptions.map((c) => (
            <Link
              key={c.id}
              href={`/worlds/${world.slug}/story?tab=character&characterId=${c.id}`}
              className={
                "rounded-full border px-3 py-1 text-sm " +
                (c.id === selectedCharacterId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface hover:border-primary/50")
              }
            >
              {c.title}
            </Link>
          ))}
          {pcOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">這個世界觀目前還沒有 PC。</p>
          )}
        </div>
      )}

      <h2 className="mt-6 text-lg font-semibold">
        {tab === "official"
          ? "章節"
          : selectedCharacter
            ? `${selectedCharacter.title} 的時間軸`
            : "請先選擇一個角色"}
      </h2>

      <ul className="mt-3 divide-y divide-border">
        {chapters.map((chapter) => (
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
        {chapters.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">目前還沒有章節。</li>
        )}
      </ul>
    </div>
  );
}
