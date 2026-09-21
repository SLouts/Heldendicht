import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorldMapSignedUrl } from "@/lib/worldmap";
import { getWorldMediaSignedUrl } from "@/lib/worldMedia";
import WorldMapView, {
  type MapLayer,
  type MapNode,
} from "@/app/dashboard/worlds/[slug]/worldmap/WorldMapView";
import { WorldHero } from "@/app/dashboard/worlds/[slug]/WorldHero";
import { NavMenu } from "@/components/NavMenu";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { RuleFieldItem } from "@/components/RuleFieldItem";
import { NodeSearchBox } from "@/components/NodeSearchBox";
import { NODE_TYPE_LABEL, NODE_STATUS_LABEL, FALLBACK_NODE_TYPE_ORDER } from "@/lib/nodeTypeLabels";
import type { Database } from "@/lib/supabase/database.types";

type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "display_name" | "username"
>;

type CharacterSummary = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  "character_type" | "owner_id"
> & {
  profiles: ProfileSummary | ProfileSummary[] | null;
};

type NodeRow = Pick<
  Database["public"]["Tables"]["nodes"]["Row"],
  "id" | "title" | "slug" | "node_type" | "status" | "is_placeholder" | "category_id"
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

export default async function WorldPage({
  params,
}: PageProps<"/worlds/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select(
      "id, name, tagline, description, default_pc_quota, banner_path, icon_path",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!world) {
    // RLS 會讓「不存在」跟「存在但你看不到(私有世界觀非成員)」回傳一樣的結果,
    // 這是刻意的 —— 不會洩漏「這個世界觀其實存在,只是你不能看」的資訊。
    notFound();
  }

  // 未登入訪客看得到的東西,跟登入後的一般成員完全一樣——不管是節點、
  // 角色、關係線,可見度都只交給資料庫的 RLS 判斷(is_public/是否為
  // 成員/status <> rejected 等),這裡不再額外用 status='approved' 之類
  // 的條件收斂一次。跟登入後唯一的差異只有「不能建立/編輯」。
  const [
    { data: nodes },
    { data: relationships },
    { data: categories },
    { data: layers },
    { data: mapNodes },
    { data: siteRules },
    { data: worldRules },
    bannerUrl,
    iconUrl,
  ] = await Promise.all([
    supabase
      .from("nodes")
      .select(
        "id, title, slug, node_type, status, is_placeholder, category_id, characters(character_type, owner_id, profiles(display_name, username))",
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
    supabase
      .from("nodes")
      .select(
        "id, title, slug, node_type, status, is_placeholder, map_layer_id, map_x, map_y, characters(character_type)",
      )
      .eq("world_id", world.id)
      .not("map_x", "is", null),
    supabase
      .from("site_rule_fields")
      .select("id, label, content")
      .order("order_index", { ascending: true }),
    supabase
      .from("world_rule_fields")
      .select("id, label, content")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    getWorldMediaSignedUrl(world.banner_path),
    getWorldMediaSignedUrl(world.icon_path),
  ]);

  // 有掛分類的節點,顯示交給下面的「分類導覽」區塊;沒掛分類的節點才
  // 落回舊的「地點/物產」「角色」兩欄分法,兩邊不會重複列出同一個節點。
  const uncategorizedNodes = (nodes ?? []).filter((n) => n.category_id == null);
  const characterNodes = uncategorizedNodes.filter((n) => n.node_type === "character");
  const categoryGroups = (categories ?? []).map((category) => ({
    category,
    nodes: (nodes ?? []).filter((n) => n.category_id === category.id),
  }));
  // 沒掛分類的地點/物產/勢力/概念/事件/文章,照類型分開展示成一個個下拉區塊,
  // 不要全部混在同一條清單裡。
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
  const placedNodes: MapNode[] = (mapNodes ?? []).map((n) => {
    const char = Array.isArray(n.characters) ? n.characters[0] : n.characters;
    return {
      id: n.id,
      title: n.title,
      slug: n.slug,
      nodeType: n.node_type,
      status: n.status,
      isPlaceholder: n.is_placeholder,
      characterType: char?.character_type ?? null,
      x: n.map_x!,
      y: n.map_y!,
      layerId: n.map_layer_id!,
    };
  });
  const hasVisibleMap = mapLayers.some((l) => l.imageUrl);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <WorldHero name={world.name} tagline={world.tagline} bannerUrl={bannerUrl} iconUrl={iconUrl} />

      <NavMenu>
        <Link
          href={`/worlds/${slug}/story`}
          className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
        >
          故事時間軸
        </Link>
        <Link
          href={`/worlds/${slug}/map`}
          className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
        >
          關係圖
        </Link>
      </NavMenu>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">搜尋這個世界觀</h2>
        <NodeSearchBox worldId={world.id} basePath={`/worlds/${slug}/nodes`} />
      </section>

      {world.description && (
        <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
          {world.description}
        </p>
      )}

      {((siteRules?.length ?? 0) > 0 || (worldRules?.length ?? 0) > 0) && (
        <section className="mt-8">
          <CollapsibleSection
            title="規則"
            count={(siteRules?.length ?? 0) + (worldRules?.length ?? 0)}
            description="投稿或使用這個網站/這個世界觀要遵守的規定、授權或權利聲明"
          >
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {worldRules?.map((rule) => <RuleFieldItem key={rule.id} rule={rule} />)}
              {siteRules?.map((rule) => (
                <RuleFieldItem key={rule.id} rule={rule} scopeLabel="全站" />
              ))}
            </ul>
          </CollapsibleSection>
        </section>
      )}

      {hasVisibleMap && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">世界地圖</h2>
          <WorldMapView
            layers={mapLayers}
            nodes={placedNodes}
            unplacedNodes={[]}
            isStaff={false}
            worldId={world.id}
            worldSlug={slug}
            basePath={`/worlds/${slug}/nodes`}
          />
        </section>
      )}

      {categoryGroups.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">分類導覽</h2>
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
                <NodeList nodes={categoryNodes} worldSlug={slug} />
              </CollapsibleSection>
            ))}
          </div>
        </section>
      )}

      {uncategorizedByType.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">
            {categoryGroups.length > 0 ? "未分類內容" : "地點 / 物產"}
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {uncategorizedByType.map(({ nodeType, nodes: typeNodes }) => (
              <CollapsibleSection
                key={nodeType}
                title={NODE_TYPE_LABEL[nodeType]}
                count={typeNodes.length}
              >
                <NodeList nodes={typeNodes} worldSlug={slug} />
              </CollapsibleSection>
            ))}
          </div>
        </section>
      )}

      {(categoryGroups.length === 0 || characterNodes.length > 0) && (
        <section className="mt-8">
          <CollapsibleSection
            title={categoryGroups.length > 0 ? "未分類角色" : "角色"}
            count={characterNodes.length}
            description={
              categoryGroups.length === 0
                ? `每人 PC 配額:${world.default_pc_quota}`
                : undefined
            }
          >
            <NodeList nodes={characterNodes} worldSlug={slug} />
          </CollapsibleSection>
        </section>
      )}

      <section className="mt-8">
        <CollapsibleSection title="人際關係線" count={relationships?.length ?? 0}>
          <RelationshipList relationships={relationships} worldSlug={slug} />
        </CollapsibleSection>
      </section>
    </div>
  );
}

function characterInfo(node: NodeRow) {
  if (node.node_type !== "character") return null;
  const char = Array.isArray(node.characters) ? node.characters[0] : node.characters;
  if (!char) return null;

  const owner = char.owner_id
    ? Array.isArray(char.profiles)
      ? char.profiles[0]
      : char.profiles
    : null;

  return {
    type: char.character_type,
    ownerLabel: owner?.display_name || owner?.username || "未知玩家",
  };
}

function NodeList({
  nodes,
  worldSlug,
}: {
  nodes: NodeRow[] | null | undefined;
  worldSlug: string;
}) {
  if (!nodes || nodes.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">目前還沒有節點。</p>;
  }

  return (
    <ul className="mt-3 divide-y divide-border">
      {nodes.map((node) => {
        const character = characterInfo(node);
        const titleSpan = (
          <span className={node.is_placeholder ? "text-muted-foreground italic" : ""}>
            {node.title}
          </span>
        );
        return (
          <li key={node.id} className="flex flex-wrap items-center gap-2 py-3">
            {node.status !== "rejected" ? (
              <Link
                href={`/worlds/${worldSlug}/nodes/${node.slug}`}
                className="hover:underline"
              >
                {titleSpan}
              </Link>
            ) : (
              titleSpan
            )}
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
            {node.status === "pending" && (
              <span className="rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg">
                {NODE_STATUS_LABEL[node.status]}
              </span>
            )}
            {node.is_placeholder && (
              <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
                待撰寫
              </span>
            )}
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
              href={`/worlds/${worldSlug}/relationships/${rel.id}`}
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

