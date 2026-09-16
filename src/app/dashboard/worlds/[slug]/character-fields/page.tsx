import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { CharacterFieldsEditor } from "./CharacterFieldsEditor";

export default async function CharacterFieldsPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/character-fields">) {
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
        <h1 className="mt-2 text-2xl font-semibold">角色必填欄位</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          只有這個世界觀的主辦/編輯可以設定角色必填欄位。
        </p>
      </div>
    );
  }

  const { data: fields } = await supabase
    .from("world_character_fields")
    .select("id, label")
    .eq("world_id", world.id)
    .order("order_index", { ascending: true });

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">{world.name} 的角色必填欄位</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        在這裡設定的欄位,會出現在這個世界觀底下所有角色(PC/NPC)的建立/編輯表單裡,玩家必須填寫才能儲存——例如性別、生日、種族。
      </p>
      <CharacterFieldsEditor
        worldId={world.id}
        worldSlug={world.slug}
        fields={fields ?? []}
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
