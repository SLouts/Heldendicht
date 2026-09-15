import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getWorldMapSignedUrl } from "@/lib/worldmap";
import WorldMapView, {
  type MapNode,
  type UnplacedNode,
} from "./WorldMapView";

export default async function WorldMapPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/worldmap">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name, map_image_path")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const [{ data: isStaff }, { data: isAdmin }, { data: nodes }] =
    await Promise.all([
      supabase.rpc("is_world_staff", { p_world_id: world.id }),
      supabase.rpc("is_world_admin", { p_world_id: world.id }),
      supabase
        .from("nodes")
        .select(
          "id, title, slug, node_type, status, is_placeholder, map_x, map_y, characters(character_type)",
        )
        .eq("world_id", world.id)
        .order("node_type")
        .order("title"),
    ]);

  const mapImageUrl = await getWorldMapSignedUrl(world.map_image_path);

  const placedNodes: MapNode[] = [];
  const unplacedNodes: UnplacedNode[] = [];

  for (const n of nodes ?? []) {
    const char = Array.isArray(n.characters) ? n.characters[0] : n.characters;
    const base = {
      id: n.id,
      title: n.title,
      slug: n.slug,
      nodeType: n.node_type,
      status: n.status,
      isPlaceholder: n.is_placeholder,
      characterType: char?.character_type ?? null,
    };
    if (n.map_x != null && n.map_y != null) {
      placedNodes.push({ ...base, x: n.map_x, y: n.map_y });
    } else {
      unplacedNodes.push(base);
    }
  }

  return (
    <div>
      <Link
        href={`/dashboard/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{world.name} 的世界地圖</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        跟「關係圖」是不同的檢視角度:這裡是有底圖、有自己座標系統的地理地圖,只顯示已經被標上位置的節點。
      </p>

      {!mapImageUrl ? (
        <p className="mt-6 text-sm text-muted-foreground">
          這個世界觀還沒有上傳地圖底圖。
          {isAdmin && (
            <>
              {" "}
              到
              <Link
                href={`/dashboard/worlds/${world.slug}/settings`}
                className="mx-1 underline"
              >
                世界觀設定
              </Link>
              上傳一張。
            </>
          )}
        </p>
      ) : (
        <WorldMapView
          imageUrl={mapImageUrl}
          nodes={placedNodes}
          unplacedNodes={unplacedNodes}
          isStaff={Boolean(isStaff)}
          worldId={world.id}
          worldSlug={world.slug}
        />
      )}
    </div>
  );
}
