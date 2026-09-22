import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { NewCharacterForm } from "./NewCharacterForm";
import { ImportCharacterForm } from "./ImportCharacterForm";
import { CharacterCreateModeSwitch } from "./CharacterCreateModeSwitch";
import { CharacterTemplatePreview } from "./CharacterTemplatePreview";

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
    { data: categoryFields },
  ] = await Promise.all([
    supabase
      .from("world_character_fields")
      .select("id, label, character_type, example_value")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("world_section_templates")
      .select("id, label, example_content")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase.rpc("is_world_staff", { p_world_id: world.id }),
    supabase
      .from("world_content_categories")
      .select("id, name, accepts_submissions, parent_id")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("world_category_fields")
      .select("category_id, label")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
  ]);

  const selectableCategories = (categories ?? []).filter(
    (c) => c.accepts_submissions || isStaff,
  );

  const fieldLabelsByCategory: Record<string, string[]> = {};
  for (const f of categoryFields ?? []) {
    (fieldLabelsByCategory[f.category_id] ??= []).push(f.label);
  }

  return (
    <div>
      <Link
        href={`/dashboard/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">在「{world.name}」新增角色</h1>
      <CharacterTemplatePreview
        fields={characterFields ?? []}
        sections={sectionTemplates ?? []}
      />
      <CharacterCreateModeSwitch
        manual={
          <NewCharacterForm
            worldId={world.id}
            worldSlug={world.slug}
            characterFields={characterFields ?? []}
            categories={selectableCategories}
            fieldLabelsByCategory={fieldLabelsByCategory}
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
