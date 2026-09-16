import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getWorldMapSignedUrl } from "@/lib/worldmap";
import { MapLayersEditor } from "./MapLayersEditor";

export default async function MapLayersPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/worldmap/layers">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: isAdmin } = await supabase.rpc("is_world_admin", {
    p_world_id: world.id,
  });

  if (!isAdmin) {
    return (
      <div>
        <BackLink slug={slug} />
        <h1 className="mt-2 text-2xl font-semibold">管理地圖圖層</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          只有這個世界觀的主辦(admin)可以管理地圖圖層。
        </p>
      </div>
    );
  }

  const { data: layers } = await supabase
    .from("world_map_layers")
    .select("id, name, image_path")
    .eq("world_id", world.id)
    .order("order_index", { ascending: true });

  const layersWithUrl = await Promise.all(
    (layers ?? []).map(async (l) => ({
      id: l.id,
      name: l.name,
      imageUrl: await getWorldMapSignedUrl(l.image_path),
      hasImage: Boolean(l.image_path),
    })),
  );

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">管理地圖圖層</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        每張圖層各自有自己的底圖跟座標系統(例如不同樓層、大陸圖/城市圖),節點一次只會標在其中一張。誰能把節點標到圖層上,由「世界地圖」頁面另外用 staff(主辦/編輯)權限控管。
      </p>
      <MapLayersEditor worldId={world.id} worldSlug={world.slug} layers={layersWithUrl} />
    </div>
  );
}

function BackLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/dashboard/worlds/${slug}/worldmap`}
      className="text-sm text-muted-foreground hover:underline"
    >
      ← 返回世界地圖
    </Link>
  );
}
