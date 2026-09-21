import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { OrderedLabelEditor } from "@/components/OrderedLabelEditor";
import {
  createCharacterField,
  deleteCharacterField,
  moveCharacterField,
  updateCharacterField,
} from "@/lib/actions/characterFields";

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
      <OrderedLabelEditor
        worldId={world.id}
        worldSlug={world.slug}
        items={fields ?? []}
        idFieldName="fieldId"
        createAction={createCharacterField}
        updateAction={updateCharacterField}
        onDelete={deleteCharacterField}
        onMove={moveCharacterField}
        newSectionLabel="新增欄位"
        newPlaceholder="例如「性別」"
        emptyText="還沒有設定任何必填欄位。"
        deleteConfirmText={(label) => `確定要刪除「${label}」這個必填欄位嗎?已經填過的角色資料也會一併清掉。`}
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
