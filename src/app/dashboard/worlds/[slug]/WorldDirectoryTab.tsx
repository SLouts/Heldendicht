import Link from "next/link";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { NODE_TYPE_LABEL, NODE_STATUS_LABEL } from "@/lib/nodeTypeLabels";
import type { Database, NodeType } from "@/lib/supabase/database.types";
import { unwrapRelation } from "@/lib/unwrapRelation";

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

export type DashboardNodeRow = Pick<
  Database["public"]["Tables"]["nodes"]["Row"],
  "id" | "title" | "slug" | "node_type" | "status" | "is_placeholder" | "creator_id" | "category_id"
> & {
  characters: CharacterSummary | CharacterSummary[] | null;
};

type RelationshipNodeSummary = Pick<Database["public"]["Tables"]["nodes"]["Row"], "title">;

export type DashboardRelationshipRow = Pick<
  Database["public"]["Tables"]["relationships"]["Row"],
  "id" | "label" | "status"
> & {
  node_a: RelationshipNodeSummary | RelationshipNodeSummary[] | null;
  node_b: RelationshipNodeSummary | RelationshipNodeSummary[] | null;
};

export type DashboardCategoryGroup = {
  category: { id: string; name: string; description: string | null; accepts_submissions: boolean };
  nodes: DashboardNodeRow[];
};

export type DashboardTypeGroup = { nodeType: NodeType; nodes: DashboardNodeRow[] };

/**
 * 後台版「條目與節點目錄」分頁——跟公開版(../[nodeSlug 以外]/WorldDirectoryTab.tsx)
 * 結構一樣,但這裡是編輯者視角:節點清單多顯示「你建立的」標籤跟完整的
 * 審核狀態(含 rejected,不是只有 pending),rejected 節點也照樣可以點進去
 * (公開版刻意隱藏連結,因為一般訪客本來就看不到 rejected 節點的內容);
 * 每個區塊標題旁邊也多了「+新增」「管理分類」這些後台操作連結。跟公開版
 * 分開成獨立檔案,不是同一個元件加 canEdit 開關硬湊——這裡的差異不只是
 * 「能不能編輯」,連資料呈現規則(哪些狀態要顯示、連結要不要隱藏)都不同。
 */
export function WorldDirectoryTab({
  categoryGroups,
  uncategorizedByType,
  characterNodes,
  relationships,
  defaultPcQuota,
  worldSlug,
  currentUserId,
}: {
  categoryGroups: DashboardCategoryGroup[];
  uncategorizedByType: DashboardTypeGroup[];
  characterNodes: DashboardNodeRow[];
  relationships: DashboardRelationshipRow[] | null | undefined;
  defaultPcQuota: number;
  worldSlug: string;
  currentUserId: string;
}) {
  const hasCategories = categoryGroups.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {hasCategories && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">分類導覽</h2>
            <Link href={`/dashboard/worlds/${worldSlug}/categories`} className="text-sm underline">
              管理分類
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-3">
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
                <NodeList nodes={categoryNodes} worldSlug={worldSlug} currentUserId={currentUserId} />
              </CollapsibleSection>
            ))}
          </div>
        </section>
      )}

      {uncategorizedByType.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{hasCategories ? "未分類內容" : "地點 / 物產"}</h2>
            <Link href={`/dashboard/worlds/${worldSlug}/nodes/new`} className="text-sm underline">
              + 新增節點
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {uncategorizedByType.map(({ nodeType, nodes: typeNodes }) => (
              <CollapsibleSection key={nodeType} title={NODE_TYPE_LABEL[nodeType]} count={typeNodes.length}>
                <NodeList nodes={typeNodes} worldSlug={worldSlug} currentUserId={currentUserId} />
              </CollapsibleSection>
            ))}
          </div>
        </section>
      )}

      {(!hasCategories || characterNodes.length > 0) && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {hasCategories ? "未分類角色" : `角色(每人 PC 配額:${defaultPcQuota})`}
            </h2>
            <Link href={`/dashboard/worlds/${worldSlug}/characters/new`} className="text-sm underline">
              + 新增角色
            </Link>
          </div>
          <CollapsibleSection title="角色清單" count={characterNodes.length}>
            <NodeList nodes={characterNodes} worldSlug={worldSlug} currentUserId={currentUserId} />
          </CollapsibleSection>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">人際關係線</h2>
          <Link href={`/dashboard/worlds/${worldSlug}/relationships/new`} className="text-sm underline">
            + 新增關係線
          </Link>
        </div>
        <CollapsibleSection title="關係線清單" count={relationships?.length ?? 0}>
          <RelationshipList relationships={relationships} worldSlug={worldSlug} />
        </CollapsibleSection>
      </section>
    </div>
  );
}

function characterInfo(node: DashboardNodeRow) {
  if (node.node_type !== "character") return null;
  const char = unwrapRelation(node.characters);
  if (!char) return null;

  const owner = char.owner_id ? unwrapRelation(char.profiles) : null;

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
  nodes: DashboardNodeRow[] | null | undefined;
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
              <span className={node.is_placeholder ? "text-muted-foreground italic" : ""}>
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
                <span className="text-xs text-muted-foreground">擁有者:{character.ownerLabel}</span>
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
  relationships: DashboardRelationshipRow[] | null | undefined;
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
              href={`/dashboard/worlds/${worldSlug}/relationships/${rel.id}`}
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
