import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { CharacterFieldsSection } from "./CharacterFieldsSection";
import { SectionTemplatesSection } from "./SectionTemplatesSection";

export default async function CharacterTemplatePage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/character-template">) {
  const { slug } = await params;
  await requireUser();
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

  if (!isStaff) {
    return (
      <div>
        <BackLink slug={slug} />
        <h1 className="mt-2 text-2xl font-semibold">角色卡設定</h1>
      </div>
    );
  }

  const [{ data: fields }, { data: sectionTemplates }] = await Promise.all([
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
  ]);

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">{world.name} 的角色卡設定</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        統一管理角色必填欄位跟補充章節,每一項都可以填一個範例值——這些範例會組成一份
        「複製純文字範本」給玩家在「新增角色」頁面直接複製貼上再修改。
      </p>

      <h2 className="mt-8 text-lg font-semibold">必填欄位</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        每個欄位可以設定成共用(PC/NPC 都適用),也可以限定只有 PC 或只有 NPC 的角色需要填。
      </p>
      <CharacterFieldsSection worldId={world.id} worldSlug={world.slug} items={fields ?? []} />

      <h2 className="mt-10 text-lg font-semibold">補充章節</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        給「貼上文字自動匯入」功能辨認用——玩家貼的文字裡,獨立成行且對到下面標題的段落,
        會自動切成一個新的補充區塊。
      </p>
      <SectionTemplatesSection
        worldId={world.id}
        worldSlug={world.slug}
        items={sectionTemplates ?? []}
      />
    </div>
  );
}

function BackLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/dashboard/worlds/${slug}`}
      className="text-sm text-muted-foreground hover:underline"
    >
      ← 返回世界觀
    </Link>
  );
}
