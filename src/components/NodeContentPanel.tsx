import Link from "next/link";
import { WikiLinkContent } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/WikiLinkContent";
import { NodeSectionsEditor } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/NodeSectionsEditor";
import { CharacterTimelineDisplay } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/CharacterTimelineDisplay";
import {
  CategoryFieldsDisplay,
  type CategoryFieldWithValue,
} from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/CategoryFieldsForm";
import { NodeTabs, type NodeTab } from "@/app/(site)/worlds/[slug]/nodes/[nodeSlug]/NodeTabs";
import type { Database } from "@/lib/supabase/database.types";
import { unwrapRelation } from "@/lib/unwrapRelation";

export type RelationshipNodeSummary = Pick<
  Database["public"]["Tables"]["nodes"]["Row"],
  "id" | "title" | "slug"
>;

export type NodeRelationshipRow = Pick<
  Database["public"]["Tables"]["relationships"]["Row"],
  "id" | "label" | "label_reverse" | "status"
> & {
  node_a: RelationshipNodeSummary | RelationshipNodeSummary[] | null;
  node_b: RelationshipNodeSummary | RelationshipNodeSummary[] | null;
};

export type NodeSectionItem = {
  id: string;
  title: string;
  content: string;
  is_spoiler: boolean;
};

export type NodeTimelineEventItem = {
  id: string;
  label: string;
  description: string;
  content: string;
  imageUrl: string | null;
  isSpoiler: boolean;
};

/**
 * 節點「主文 + 補充區塊 + 時間軸 + 人際關係」那組分頁,原本寫死在公開版
 * 節點詳細頁(worlds/[slug]/nodes/[nodeSlug]/page.tsx)裡,現在抽成共用
 * 元件——跨世界觀 PC persona 展示頁的「世界觀節點」分頁需要一模一樣的
 * 渲染邏輯,兩邊共用一份,之後要調整內容呈現方式只要改一個地方。
 *
 * 純渲染元件,不自己查資料——資料(sections/timelineEvents/relationships
 * 等)一律由呼叫端先查好、轉成這裡要的形狀再傳進來,可見度完全交給呼叫端
 * 的查詢過程(各自的 RLS)把關,這裡不重複判斷。
 */
export function NodeContentPanel({
  nodeId,
  nodeContent,
  worldSlug,
  wikiLinkMap,
  imageMap,
  fileAttachments,
  sections,
  timelineEventItems,
  relationships,
  categoryFields,
}: {
  nodeId: string;
  nodeContent: string;
  worldSlug: string;
  wikiLinkMap: Map<string, { slug: string; isPlaceholder: boolean }>;
  imageMap: Map<string, { url: string; fileName: string; isSpoiler: boolean }>;
  fileAttachments: { id: string; url: string; file_name: string }[];
  sections: NodeSectionItem[];
  timelineEventItems: NodeTimelineEventItem[];
  relationships: NodeRelationshipRow[];
  categoryFields?: CategoryFieldWithValue[];
}) {
  const tabs: NodeTab[] = [
    {
      key: "content",
      label: "主文",
      content: (
        <>
          {nodeContent ? (
            <WikiLinkContent
              content={nodeContent}
              basePath={`/worlds/${worldSlug}/nodes`}
              links={wikiLinkMap}
              images={imageMap}
            />
          ) : (
            <p className="text-sm text-muted-foreground">還沒有內文。</p>
          )}

          {categoryFields && categoryFields.length > 0 && (
            <CategoryFieldsDisplay fields={categoryFields} />
          )}

          {fileAttachments.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">附件</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {fileAttachments.map((a) => (
                  <li key={a.id} className="text-sm">
                    <a href={a.url} className="underline">
                      {a.file_name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ),
    },
  ];

  if (timelineEventItems.length > 0) {
    tabs.push({
      key: "timeline",
      label: "時間軸",
      content: <CharacterTimelineDisplay events={timelineEventItems} />,
    });
  }

  if (sections.length > 0) {
    tabs.push({
      key: "sections",
      label: "補充區塊",
      content: (
        <NodeSectionsEditor
          nodeId={nodeId}
          worldSlug={worldSlug}
          nodeSlug=""
          canEdit={false}
          sections={sections}
          hideHeading
        />
      ),
    });
  }

  if (relationships.length > 0) {
    tabs.push({
      key: "relationships",
      label: "人際關係",
      content: (
        <NodeRelationshipList
          relationships={relationships}
          worldSlug={worldSlug}
          currentNodeId={nodeId}
        />
      ),
    });
  }

  return <NodeTabs tabs={tabs} />;
}

/** 節點分頁裡的「人際關係」清單——顯示這個節點跟其他節點之間的關係線,
 * 連去公開版的關係線詳細頁。跟世界觀首頁的 RelationshipList 不同的是
 * 這裡只列跟「目前這個節點」有關的關係,並且用另一端節點的標題當主要
 * 顯示文字,而不是「A ↔ B」。 */
function NodeRelationshipList({
  relationships,
  worldSlug,
  currentNodeId,
}: {
  relationships: NodeRelationshipRow[];
  worldSlug: string;
  currentNodeId: string;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {relationships.map((rel) => {
        const nodeA = unwrapRelation(rel.node_a);
        const nodeB = unwrapRelation(rel.node_b);
        const isSelfA = nodeA?.id === currentNodeId;
        const other = isSelfA ? nodeB : nodeA;
        if (!other) return null;

        const label = isSelfA ? rel.label : rel.label_reverse || rel.label;
        const isRevoked = rel.status === "revoked";

        return (
          <li key={rel.id} className="py-3">
            <Link
              href={`/worlds/${worldSlug}/relationships/${rel.id}`}
              className={
                "flex flex-wrap items-center gap-2 hover:underline" +
                (isRevoked ? " text-muted-foreground" : "")
              }
            >
              <span className="font-medium">{other.title}</span>
              {label && <span className="text-xs text-muted-foreground">{label}</span>}
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
