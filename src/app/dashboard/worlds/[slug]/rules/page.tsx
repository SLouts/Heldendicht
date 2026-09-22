import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { OrderedContentEditor } from "@/components/OrderedContentEditor";
import {
  createWorldRuleField,
  deleteWorldRuleField,
  moveWorldRuleField,
  updateWorldRuleField,
} from "@/lib/actions/worldRuleFields";

export default async function WorldRulesPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/rules">) {
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
        <h1 className="mt-2 text-2xl font-semibold">世界觀規則</h1>
      </div>
    );
  }

  const { data: fields } = await supabase
    .from("world_rule_fields")
    .select("id, label, content")
    .eq("world_id", world.id)
    .order("order_index", { ascending: true });

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">{world.name} 的規則</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        投稿或使用這個世界觀要遵守的規定、授權或權利聲明,不是世界觀本身的介紹內容——訪客會在世界觀頁面看到,跟全站規則並列顯示。
      </p>
      <OrderedContentEditor
        items={fields ?? []}
        extraHiddenFields={
          <>
            <input type="hidden" name="worldId" value={world.id} />
            <input type="hidden" name="worldSlug" value={world.slug} />
          </>
        }
        createAction={createWorldRuleField}
        updateAction={updateWorldRuleField}
        onDelete={deleteWorldRuleField.bind(null, world.slug)}
        onMove={moveWorldRuleField.bind(null, world.id, world.slug)}
        newLabel="新增規則"
        newLabelPlaceholder="例如「投稿規範」"
        emptyText="還沒有設定任何世界觀規則。"
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
