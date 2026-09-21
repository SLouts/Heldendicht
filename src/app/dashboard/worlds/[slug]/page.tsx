import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getWorldMediaSignedUrl } from "@/lib/worldMedia";
import { getWorldMapSignedUrl } from "@/lib/worldmap";
import { NavMenu } from "@/components/NavMenu";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { NODE_TYPE_LABEL, NODE_STATUS_LABEL, FALLBACK_NODE_TYPE_ORDER } from "@/lib/nodeTypeLabels";
import { NodeSearchBox } from "@/components/NodeSearchBox";
import { WorldHero } from "./WorldHero";
import WorldMapView, {
  type MapLayer,
  type MapNode,
  type UnplacedNode,
} from "./worldmap/WorldMapView";
import type { Database } from "@/lib/supabase/database.types";

type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "display_name" | "username" | "email"
>;

type CharacterSummary = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  "character_type" | "owner_id"
> & {
  profiles: ProfileSummary | ProfileSummary[] | null;
};

type NodeRow = Pick<
  Database["public"]["Tables"]["nodes"]["Row"],
  | "id"
  | "title"
  | "slug"
  | "node_type"
  | "status"
  | "is_placeholder"
  | "creator_id"
  | "category_id"
  | "map_layer_id"
  | "map_x"
  | "map_y"
> & {
  characters: CharacterSummary | CharacterSummary[] | null;
};

type RelationshipNodeSummary = Pick<
  Database["public"]["Tables"]["nodes"]["Row"],
  "title"
>;

type RelationshipRow = Pick<
  Database["public"]["Tables"]["relationships"]["Row"],
  "id" | "label" | "status"
> & {
  node_a: RelationshipNodeSummary | RelationshipNodeSummary[] | null;
  node_b: RelationshipNodeSummary | RelationshipNodeSummary[] | null;
};

export default async function WorldDashboardPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]">) {
  const { slug } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select(
      "id, slug, name, tagline, default_pc_quota, is_public, banner_path, icon_path",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!world) notFound();

  const [
    { data: isStaff },
    { data: isAdmin },
    { data: nodes },
    { data: relationships },
    { data: categories },
    { data: layers },
    bannerUrl,
    iconUrl,
  ] = await Promise.all([
    supabase.rpc("is_world_staff", { p_world_id: world.id }),
    supabase.rpc("is_world_admin", { p_world_id: world.id }),
    supabase
      .from("nodes")
      .select(
        "id, title, slug, node_type, status, is_placeholder, creator_id, category_id, map_layer_id, map_x, map_y, characters(character_type, owner_id, profiles(display_name, username, email))",
      )
      .eq("world_id", world.id)
      .order("node_type")
      .order("title"),
    supabase
      .from("relationships")
      .select(
        "id, label, status, node_a:nodes!relationships_node_a_id_fkey(title), node_b:nodes!relationships_node_b_id_fkey(title)",
      )
      .eq("world_id", world.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("world_content_categories")
      .select("id, name, description, accepts_submissions")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("world_map_layers")
      .select("id, name, image_path")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    getWorldMediaSignedUrl(world.banner_path),
    getWorldMediaSignedUrl(world.icon_path),
  ]);

  const uncategorizedNodes = (nodes ?? []).filter((n) => n.category_id == null);
  const characterNodes = uncategorizedNodes.filter((n) => n.node_type === "character");
  const categoryGroups = (categories ?? []).map((category) => ({
    category,
    nodes: (nodes ?? []).filter((n) => n.category_id === category.id),
  }));
  const uncategorizedByType = FALLBACK_NODE_TYPE_ORDER.map((nodeType) => ({
    nodeType,
    nodes: uncategorizedNodes.filter((n) => n.node_type === nodeType),
  })).filter((g) => g.nodes.length > 0);

  const mapLayers: MapLayer[] = await Promise.all(
    (layers ?? []).map(async (l) => ({
      id: l.id,
      name: l.name,
      imageUrl: await getWorldMapSignedUrl(l.image_path),
    })),
  );
  const placedMapNodes: MapNode[] = [];
  const unplacedMapNodes: UnplacedNode[] = [];
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
    if (n.map_x != null && n.map_y != null && n.map_layer_id != null) {
      placedMapNodes.push({ ...base, x: n.map_x, y: n.map_y, layerId: n.map_layer_id });
    } else {
      unplacedMapNodes.push(base);
    }
  }
  const hasVisibleMap = mapLayers.some((l) => l.imageUrl);

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← 我的世界觀
      </Link>
      <div className="mt-2">
        <WorldHero name={world.name} tagline={world.tagline} bannerUrl={bannerUrl} iconUrl={iconUrl} />
      </div>

      <NavMenu>
        <Link
          href={`/worlds/${world.slug}`}
          className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
        >
          公開頁面
        </Link>
        <Link
          href={`/dashboard/worlds/${world.slug}/story`}
          className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
        >
          故事時間軸
        </Link>
        <Link
          href={`/dashboard/worlds/${world.slug}/map`}
          className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
        >
          關係圖
        </Link>
        <Link
          href={`/dashboard/worlds/${world.slug}/worldmap`}
          className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
        >
          世界地圖
        </Link>
        {isStaff && (
          <Link
            href={`/dashboard/worlds/${world.slug}/character-fields`}
            className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
          >
            角色必填欄位
          </Link>
        )}
        {isStaff && (
          <Link
            href={`/dashboard/worlds/${world.slug}/section-templates`}
            className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
          >
            補充區塊範本
          </Link>
        )}
        {isStaff && (
          <Link
            href={`/dashboard/worlds/${world.slug}/rules`}
            className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
          >
            世界觀規則
          </Link>
        )}
        {isStaff && (
          <Link
            href={`/dashboard/worlds/${world.slug}/categories`}
            className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
          >
            內容分類
          </Link>
        )}
        {isStaff && (
          <Link
            href={`/dashboard/worlds/${world.slug}/reports`}
            className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
          >
            檢舉列表
          </Link>
        )}
        {isAdmin && (
          <Link
            href={`/dashboard/worlds/${world.slug}/members`}
            className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
          >
            成員
          </Link>
        )}
        {isStaff && (
          <Link
            href={`/dashboard/worlds/${world.slug}/settings`}
            className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
          >
            世界觀設定
          </Link>
        )}
      </NavMenu>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">搜尋這個世界觀</h2>
        <NodeSearchBox worldId={world.id} basePath={`/dashboard/worlds/${world.slug}/nodes`} />
      </section>

      {(hasVisibleMap || isStaff) && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">世界地圖</h2>
          <WorldMapView
            layers={mapLayers}
            nodes={placedMapNodes}
            unplacedNodes={unplacedMapNodes}
            isStaff={Boolean(isStaff)}
            manageLayersHref={
              isAdmin ? `/dashboard/worlds/${world.slug}/worldmap/layers` : undefined
            }
            worldId={world.id}
            worldSlug={world.slug}
            basePath={`/dashboard/worlds/${world.slug}/nodes`}
          />
        </section>
      )}

      {categoryGroups.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">分類導覽</h2>
            <Link
              href={`/dashboard/worlds/${world.slug}/categories`}
              className="text-sm underline"
            >
              管理分類
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {categoryGroups.map(({ category, nodes: categoryNodes }) => (
              <CollapsibleSection
                key={category.id}
                title={category.name}
                count={categoryNodes.length}
                description={category.description ?? undefined}
                badge={
                  <span
                    className={
                      category.accepts_submissions
                        ? "rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg"
                        : "rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg"
                    }
                  >
                    {category.accepts_submissions ? "開放投稿" : "未開放"}
                  </span>
                }
              >
                <NodeList nodes={categoryNodes} worldSlug={world.slug} currentUserId={user.id} />
              </CollapsibleSection>
            ))}
          </div>
        </section>
      )}

      {uncategorizedByType.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {categoryGroups.length > 0 ? "未分類內容" : "地點 / 物產"}
            </h2>
            <Link
              href={`/dashboard/worlds/${world.slug}/nodes/new`}
              className="text-sm underline"
            >
              + 新增節點
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {uncategorizedByType.map(({ nodeType, nodes: typeNodes }) => (
              <CollapsibleSection
                key={nodeType}
                title={NODE_TYPE_LABEL[nodeType]}
                count={typeNodes.length}
              >
                <NodeList nodes={typeNodes} worldSlug={world.slug} currentUserId={user.id} />
              </CollapsibleSection>
            ))}
          </div>
        </section>
      )}

      {(categoryGroups.length === 0 || characterNodes.length > 0) && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {categoryGroups.length > 0
                ? "未分類角色"
                : `角色(每人 PC 配額:${world.default_pc_quota})`}
            </h2>
            <Link
              href={`/dashboard/worlds/${world.slug}/characters/new`}
              className="text-sm underline"
            >
              + 新增角色
            </Link>
          </div>
          <CollapsibleSection title="角色清單" count={characterNodes.length}>
            <NodeList
              nodes={characterNodes}
              worldSlug={world.slug}
              currentUserId={user.id}
            />
          </CollapsibleSection>
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">人際關係線</h2>
          <Link
            href={`/dashboard/worlds/${world.slug}/relationships/new`}
            className="text-sm underline"
          >
            + 新增關係線
          </Link>
        </div>
        <CollapsibleSection title="關係線清單" count={relationships?.length ?? 0}>
          <RelationshipList relationships={relationships} worldSlug={world.slug} />
        </CollapsibleSection>
      </section>
    </div>
  );
}

function characterInfo(node: NodeRow) {
  if (node.node_type !== "character") return null;
  const char = Array.isArray(node.characters)
    ? node.characters[0]
    : node.characters;
  if (!char) return null;

  const owner = char.owner_id
    ? Array.isArray(char.profiles)
      ? char.profiles[0]
      : char.profiles
    : null;

  return {
    type: char.character_type,
    ownerLabel: owner?.display_name || owner?.username || owner?.email || "未知玩家",
  };
}

function NodeList({
  nodes,
  worldSlug,
  currentUserId,
}: {
  nodes: NodeRow[] | null | undefined;
  worldSlug: string;
  currentUserId: string;
}) {
  if (!nodes || nodes.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">目前還沒有節點。</p>;
  }

  return (
    <ul className="mt-3 divide-y divide-border">
      {nodes.map((node) => {
        const character = characterInfo(node);
        return (
          <li key={node.id}>
            <Link
              href={`/dashboard/worlds/${worldSlug}/nodes/${node.slug}`}
              className="flex flex-wrap items-center gap-2 py-3 hover:underline"
            >
              <span
                className={node.is_placeholder ? "text-muted-foreground italic" : ""}
              >
                {node.title}
              </span>
              {character && (
                <span
                  className={
                    character.type === "pc"
                      ? "rounded-full bg-badge-info-bg px-1.5 py-0.5 text-xs text-badge-info-fg"
                      : "rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg"
                  }
                >
                  {character.type === "pc" ? "PC" : "NPC"}
                </span>
              )}
              {character?.type === "pc" && (
                <span className="text-xs text-muted-foreground">
                  擁有者:{character.ownerLabel}
                </span>
              )}
              {node.status !== "approved" && (
                <span
                  className={
                    node.status === "rejected"
                      ? "rounded-full bg-badge-danger-bg px-1.5 py-0.5 text-xs text-badge-danger-fg"
                      : "rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg"
                  }
                >
                  {NODE_STATUS_LABEL[node.status]}
                </span>
              )}
              {node.creator_id === currentUserId && (
                <span className="text-xs text-muted-foreground">你建立的</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function RelationshipList({
  relationships,
  worldSlug,
}: {
  relationships: RelationshipRow[] | null | undefined;
  worldSlug: string;
}) {
  if (!relationships || relationships.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">目前還沒有關係線。</p>;
  }

  return (
    <ul className="mt-3 divide-y divide-border">
      {relationships.map((rel) => {
        const nodeA = Array.isArray(rel.node_a) ? rel.node_a[0] : rel.node_a;
        const nodeB = Array.isArray(rel.node_b) ? rel.node_b[0] : rel.node_b;
        const isRevoked = rel.status === "revoked";
        return (
          <li key={rel.id}>
            <Link
              href={`/dashboard/worlds/${worldSlug}/relationships/${rel.id}`}
              className={
                "flex flex-wrap items-center gap-2 py-3 hover:underline" +
                (isRevoked ? " text-muted-foreground" : "")
              }
            >
              <span>
                {nodeA?.title} ↔ {nodeB?.title}
              </span>
              {rel.label && (
                <span className="text-xs text-muted-foreground">{rel.label}</span>
              )}
              {isRevoked && (
                <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
                  已撤銷
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
