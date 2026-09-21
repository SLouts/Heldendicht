import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { NewCharacterForm } from "./NewCharacterForm";
import { ImportCharacterForm } from "./ImportCharacterForm";
import { CharacterCreateModeSwitch } from "./CharacterCreateModeSwitch";

export default async function NewCharacterPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/characters/new">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name, default_pc_quota")
    .eq("slug", slug)
    .maybeSingle();

  if (!world) notFound();

  const [
    { data: characterFields },
    { data: sectionTemplates },
    { data: isStaff },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("world_character_fields")
      .select("id, label")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("world_section_templates")
      .select("id, label")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase.rpc("is_world_staff", { p_world_id: world.id }),
    supabase
      .from("world_content_categories")
      .select("id, name, accepts_submissions")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
  ]);

  const selectableCategories = (categories ?? []).filter(
    (c) => c.accepts_submissions || isStaff,
  );

  return (
    <div>
      <Link
        href={`/dashboard/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">在「{world.name}」新增角色</h1>
      <CharacterCreateModeSwitch
        manual={
          <NewCharacterForm
            worldId={world.id}
            worldSlug={world.slug}
            characterFields={characterFields ?? []}
            categories={selectableCategories}
          />
        }
        importForm={
          <ImportCharacterForm
            worldId={world.id}
            worldSlug={world.slug}
            characterFields={characterFields ?? []}
            sectionTemplates={sectionTemplates ?? []}
            categories={selectableCategories}
          />
        }
      />
    </div>
  );
}
