import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { NewNodeForm } from "./NewNodeForm";

export default async function NewNodePage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/nodes/new">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!world) notFound();

  return (
    <div>
      <Link
        href={`/dashboard/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">在「{world.name}」新增節點</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        新節點會先進入「未正式過審」狀態,主辦/編輯者審核後才會轉為已過審。
      </p>
      <NewNodeForm worldId={world.id} worldSlug={world.slug} />
    </div>
  );
}
