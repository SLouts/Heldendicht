import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { WorldAdminLinks } from "../WorldAdminLinks";

/**
 * 手機版的管理功能入口——電腦版是 NodeTabs 的「設定」分頁(跟其他分頁
 * 共用一頁、client state 切換),手機版沒有那套 client tab,所以另外
 * 開一個路由,跟 /map、/story、/directory 那幾個手機分頁路由是同樣的
 * 做法。清單內容跟電腦版共用同一份 WorldAdminLinks。
 */
export default async function WorldAdminPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/admin">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, is_solo")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: isStaff } = await supabase.rpc("is_world_staff", { p_world_id: world.id });

  if (!isStaff) {
    return (
      <div>
        <WorldMainTabs basePath={`/dashboard/worlds/${world.slug}`} />
        <h1 className="mt-6 text-2xl font-semibold">設定</h1>
        <p className="mt-2 text-sm text-muted-foreground">只有主辦或編輯能使用管理功能。</p>
      </div>
    );
  }

  const { data: isAdmin } = await supabase.rpc("is_world_admin", { p_world_id: world.id });

  return (
    <div>
      <WorldMainTabs basePath={`/dashboard/worlds/${world.slug}`} showAdminTab />
      <h1 className="mt-6 text-2xl font-semibold">設定</h1>
      <div className="mt-4">
        <WorldAdminLinks worldSlug={world.slug} isAdmin={Boolean(isAdmin)} isSolo={world.is_solo} />
      </div>
    </div>
  );
}
