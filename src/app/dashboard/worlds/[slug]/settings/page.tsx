import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export default async function WorldSettingsPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/settings">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select(
      "id, slug, name, tagline, description, default_pc_quota, is_public",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!world) notFound();

  // 這裡只是體驗上的攔截(不顯示表單),真正的權限邊界是
  // worlds_update_admin 這條 RLS policy —— 就算有人繞過這個畫面
  // 直接送出表單,資料庫還是會擋下來。
  const { data: isAdmin } = await supabase.rpc("is_world_admin", {
    p_world_id: world.id,
  });

  if (!isAdmin) {
    return (
      <div>
        <BackLink slug={slug} />
        <h1 className="mt-2 text-2xl font-semibold">世界觀設定</h1>
      </div>
    );
  }

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">世界觀設定</h1>
      <SettingsForm world={world} />

      <h2 className="mt-10 text-lg font-semibold">世界地圖圖層</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        地圖可以分成好幾張圖層(例如不同樓層、大陸圖/城市圖),各自有自己的底圖跟座標系統。
      </p>
      <Link
        href={`/dashboard/worlds/${world.slug}/worldmap/layers`}
        className="mt-2 inline-block w-fit rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary-hover"
      >
        管理地圖圖層
      </Link>
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
