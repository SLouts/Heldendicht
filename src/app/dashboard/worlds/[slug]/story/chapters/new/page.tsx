import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { NewChapterForm } from "./NewChapterForm";

export default async function NewChapterPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/story/chapters/new">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const backHref = `/dashboard/worlds/${world.slug}/story`;

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
      <NewChapterForm worldId={world.id} worldSlug={world.slug} />
    </div>
  );
}
