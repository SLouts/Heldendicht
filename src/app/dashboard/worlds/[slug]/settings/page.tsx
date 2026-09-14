import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getWorldMapSignedUrl } from "@/lib/worldmap";
import { SettingsForm } from "./SettingsForm";
import { WorldMapSettingsForm } from "./WorldMapSettingsForm";

export default async function WorldSettingsPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/settings">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select(
      "id, slug, name, tagline, description, default_pc_quota, is_public, map_image_path",
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
        <p className="mt-4 text-sm text-muted-foreground">
          只有這個世界觀的主辦(admin)可以修改設定。
        </p>
      </div>
    );
  }

  const mapImageUrl = await getWorldMapSignedUrl(world.map_image_path);

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">世界觀設定</h1>
      <SettingsForm world={world} />

      <h2 className="mt-10 text-lg font-semibold">世界地圖底圖</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        上傳一張世界地圖圖片,之後可以在「世界地圖」頁面把地點/角色/物產標到圖上。
        誰可以標點、拖曳位置在世界地圖頁面另外由 staff(主辦/編輯)權限控管。
      </p>
      <WorldMapSettingsForm
        worldId={world.id}
        worldSlug={world.slug}
        currentImageUrl={mapImageUrl}
        hasMap={Boolean(world.map_image_path)}
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
