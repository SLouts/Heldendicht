import Link from "next/link";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { NODE_TYPE_LABEL, NODE_STATUS_LABEL } from "@/lib/nodeTypeLabels";
import type { Database, NodeType } from "@/lib/supabase/database.types";
import { unwrapRelation } from "@/lib/unwrapRelation";

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

export type DirectoryNodeRow = Pick<
  Database["public"]["Tables"]["nodes"]["Row"],
  "id" | "title" | "slug" | "node_type" | "status" | "is_placeholder" | "category_id"
> & {
  characters: CharacterSummary | CharacterSummary[] | null;
};

type RelationshipNodeSummary = Pick<Database["public"]["Tables"]["nodes"]["Row"], "title">;

export type DirectoryRelationshipRow = Pick<
  Database["public"]["Tables"]["relationships"]["Row"],
  "id" | "label" | "status"
> & {
  node_a: RelationshipNodeSummary | RelationshipNodeSummary[] | null;
  node_b: RelationshipNodeSummary | RelationshipNodeSummary[] | null;
};

export type CategoryGroup = {
  category: {
    id: string;
    name: string;
    description: string | null;
    accepts_submissions: boolean;
    parent_id: string | null;
  };
  nodes: DirectoryNodeRow[];
};

export type TypeGroup = { nodeType: NodeType; nodes: DirectoryNodeRow[] };

/**
 * 「條目與節點目錄」分頁——分類導覽(依 world_content_categories 分組)+
 * 未分類節點依 node_type 分組+角色+人際關係線,原本首頁裡這幾塊的邏輯
 * 原封不動搬過來,只是外層從「一路往下的區塊」改成分頁裡的內容。
 */
export function WorldDirectoryTab({
  categoryGroups,
  uncategorizedByType,
  characterNodes,
  relationships,
  defaultPcQuota,
  worldSlug,
}: {
  categoryGroups: CategoryGroup[];
  uncategorizedByType: TypeGroup[];
  characterNodes: DirectoryNodeRow[];
  relationships: DirectoryRelationshipRow[] | null | undefined;
  defaultPcQuota: number;
  worldSlug: string;
}) {
  const hasCategories = categoryGroups.length > 0;

  // 分類固定兩層:大分類底下的子分類巢狀顯示在同一個收合區塊裡——找不到
  // 對應大分類的(理論上不該發生,防禦性處理)一律當頂層顯示,不會漏掉。
  const groupIds = new Set(categoryGroups.map((g) => g.category.id));
  const topLevelGroups = categoryGroups.filter(
    (g) => g.category.parent_id === null || !groupIds.has(g.category.parent_id),
  );
  const childGroupsByParent = new Map<string, CategoryGroup[]>();
  for (const g of categoryGroups) {
    if (g.category.parent_id && groupIds.has(g.category.parent_id)) {
      const list = childGroupsByParent.get(g.category.parent_id) ?? [];
      list.push(g);
      childGroupsByParent.set(g.category.parent_id, list);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {hasCategories && (
        <section>
          <h2 className="text-lg font-semibold">分類導覽</h2>
          <div className="mt-3 flex flex-col gap-3">
            {topLevelGroups.map(({ category, nodes: categoryNodes }) => {
              const childGroups = childGroupsByParent.get(category.id) ?? [];
              const totalCount =
                categoryNodes.length + childGroups.reduce((sum, g) => sum + g.nodes.length, 0);
              return (
                <CollapsibleSection
                  key={category.id}
                  title={category.name}
                  count={totalCount}
                  description={category.description ?? undefined}
                  badge={<SubmissionBadge accepts={category.accepts_submissions} />}
                >
                  <NodeList nodes={categoryNodes} worldSlug={worldSlug} />
                  {childGroups.length > 0 && (
                    <div className="mt-3 flex flex-col gap-3">
                      {childGroups.map(({ category: child, nodes: childNodes }) => (
                        <CollapsibleSection
                          key={child.id}
                          title={child.name}
                          count={childNodes.length}
                          description={child.description ?? undefined}
                          badge={<SubmissionBadge accepts={child.accepts_submissions} />}
                        >
                          <NodeList nodes={childNodes} worldSlug={worldSlug} />
                        </CollapsibleSection>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>
              );
            })}
          </div>
        </section>
      )}

      {uncategorizedByType.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">{hasCategories ? "未分類內容" : "地點 / 物產"}</h2>
          <div className="mt-3 flex flex-col gap-3">
            {uncategorizedByType.map(({ nodeType, nodes: typeNodes }) => (
              <CollapsibleSection key={nodeType} title={NODE_TYPE_LABEL[nodeType]} count={typeNodes.length}>
                <NodeList nodes={typeNodes} worldSlug={worldSlug} />
              </CollapsibleSection>
            ))}
          </div>
        </section>
      )}

      {(!hasCategories || characterNodes.length > 0) && (
        <section>
          <CollapsibleSection
            title={hasCategories ? "未分類角色" : "角色"}
            count={characterNodes.length}
            description={!hasCategories ? `每人 PC 配額:${defaultPcQuota}` : undefined}
          >
            <NodeList nodes={characterNodes} worldSlug={worldSlug} />
          </CollapsibleSection>
        </section>
      )}

      <section>
        <CollapsibleSection title="人際關係線" count={relationships?.length ?? 0}>
          <RelationshipList relationships={relationships} worldSlug={worldSlug} />
        </CollapsibleSection>
      </section>
    </div>
  );
}

function SubmissionBadge({ accepts }: { accepts: boolean }) {
  return (
    <span
      className={
        accepts
          ? "rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg"
          : "rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg"
      }
    >
      {accepts ? "開放投稿" : "未開放"}
    </span>
  );
}

function characterInfo(node: DirectoryNodeRow) {
  if (node.node_type !== "character") return null;
  const char = unwrapRelation(node.characters);
  if (!char) return null;

  const owner = char.owner_id ? unwrapRelation(char.profiles) : null;

  return {
    type: char.character_type,
    ownerLabel: owner?.display_name || owner?.username || "未知玩家",
  };
}

function NodeList({
  nodes,
  worldSlug,
}: {
  nodes: DirectoryNodeRow[] | null | undefined;
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
              <Link href={`/worlds/${worldSlug}/nodes/${node.slug}`} className="hover:underline">
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
              <span className="text-xs text-muted-foreground">擁有者:{character.ownerLabel}</span>
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
  relationships: DirectoryRelationshipRow[] | null | undefined;
  worldSlug: string;
}) {
  if (!relationships || relationships.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">目前還沒有關係線。</p>;
  }

  return (
    <ul className="mt-3 divide-y divide-border">
      {relationships.map((rel) => {
        const nodeA = unwrapRelation(rel.node_a);
        const nodeB = unwrapRelation(rel.node_b);
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
              {rel.label && <span className="text-xs text-muted-foreground">{rel.label}</span>}
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
