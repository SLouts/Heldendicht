import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { SectionTemplatesEditor } from "./SectionTemplatesEditor";

export default async function SectionTemplatesPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/section-templates">) {
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
        <h1 className="mt-2 text-2xl font-semibold">補充區塊範本</h1>
      </div>
    );
  }

  const { data: templates } = await supabase
    .from("world_section_templates")
    .select("id, label")
    .eq("world_id", world.id)
    .order("order_index", { ascending: true });

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">{world.name} 的補充區塊範本</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        列出角色通常會有哪些補充區塊(例如「技能」「外觀」「背景故事」),「貼上文字自動匯入」功能會依這份清單辨認玩家貼的文字裡哪些標題該切成獨立的補充區塊。刪掉範本不會影響已經建立的補充區塊,也不會限制手動新增不在清單裡的區塊。
      </p>
      <SectionTemplatesEditor
        worldId={world.id}
        worldSlug={world.slug}
        templates={templates ?? []}
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
