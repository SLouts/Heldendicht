import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorldMapSignedUrl } from "@/lib/worldmap";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import WorldMapView, {
  type MapLayer,
  type MapNode,
  type UnplacedNode,
} from "@/app/dashboard/worlds/[slug]/worldmap/WorldMapView";
import { unwrapRelation } from "@/lib/unwrapRelation";

/**
 * 公開版世界地圖,唯讀——邏輯比照後台版(dashboard/worlds/[slug]/worldmap),
 * 只是不需要登入、沒有編輯標點/管理圖層的入口,可見度交給 RLS。
 */
export default async function PublicWorldMapPage({
  params,
}: PageProps<"/worlds/[slug]/worldmap">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const [{ data: layers }, { data: nodes }] = await Promise.all([
    supabase
      .from("world_map_layers")
      .select("id, name, image_path")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("nodes")
      .select(
        "id, title, slug, node_type, status, is_placeholder, map_layer_id, map_x, map_y, characters(character_type)",
      )
      .eq("world_id", world.id)
      .order("node_type")
      .order("title"),
  ]);

  const mapLayers: MapLayer[] = await Promise.all(
    (layers ?? []).map(async (l) => ({
      id: l.id,
      name: l.name,
      imageUrl: await getWorldMapSignedUrl(l.image_path),
    })),
  );

  const placedNodes: MapNode[] = [];
  const unplacedNodes: UnplacedNode[] = [];

  for (const n of nodes ?? []) {
    const char = unwrapRelation(n.characters);
    const base = {
      id: n.id,
      title: n.title,
      slug: n.slug,
      nodeType: n.node_type,
      status: n.status,
      isPlaceholder: n.is_placeholder,
      characterType: char?.character_type ?? null,
    };
    if (n.map_x != null && n.map_y != null && n.map_layer_id != null) {
      placedNodes.push({ ...base, x: n.map_x, y: n.map_y, layerId: n.map_layer_id });
    } else {
      unplacedNodes.push(base);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <WorldMainTabs basePath={`/worlds/${world.slug}`} />

      <WorldMapView
        layers={mapLayers}
        nodes={placedNodes}
        unplacedNodes={unplacedNodes}
        isStaff={false}
        worldId={world.id}
        worldSlug={world.slug}
        basePath={`/worlds/${world.slug}/nodes`}
      />
    </div>
  );
}
