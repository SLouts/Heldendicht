import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAttachmentSignedUrl } from "@/lib/attachments";
import { getNodeMediaSignedUrl } from "@/lib/nodeMedia";
import { WikiLinkContent } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/WikiLinkContent";
import { NodeSectionsEditor } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/NodeSectionsEditor";
import { CharacterTimelineDisplay } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/CharacterTimelineDisplay";
import { NodeHero } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/NodeHero";
import { NodeInfobox } from "./NodeInfobox";
import { NodeTabs, type NodeTab } from "./NodeTabs";
import { NODE_TYPE_LABEL, NODE_STATUS_LABEL } from "@/lib/nodeTypeLabels";
import type { Database } from "@/lib/supabase/database.types";
import { unwrapRelation } from "@/lib/unwrapRelation";

type RelationshipNodeSummary = Pick<
  Database["public"]["Tables"]["nodes"]["Row"],
  "id" | "title" | "slug"
>;

type NodeRelationshipRow = Pick<
  Database["public"]["Tables"]["relationships"]["Row"],
  "id" | "label" | "label_reverse" | "status"
> & {
  node_a: RelationshipNodeSummary | RelationshipNodeSummary[] | null;
  node_b: RelationshipNodeSummary | RelationshipNodeSummary[] | null;
};

/**
 * 公開版節點頁面——可見度完全交給 nodes_select_visible RLS
 * (status <> 'rejected' + can_view_world_content),跟登入後的一般成員
 * 看到的範圍一致,不另外用 status='approved' 收斂一次:未登入訪客跟
 * 登入後唯一的差異只有「不能建立/編輯」,不是能看到多少內容。
 * 純唯讀,不含審核/編輯/上傳這些後台操作。
 *
 * 佈局分成上方 NodeHero 橫幅+下方雙欄:桌面(lg 以上)主內容區(8 欄)
 * 用 NodeTabs 分頁切換主文/時間軸/補充區塊/人際關係,側邊欄(4 欄)用
 * NodeInfobox 資訊卡;手機收成單欄堆疊,資訊卡在上、分頁內容在下。
 */
export default async function PublicNodeDetailPage({
  params,
}: PageProps<"/worlds/[slug]/nodes/[nodeSlug]">) {
  const { slug, nodeSlug } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: node } = await supabase
    .from("nodes")
    .select(
      "id, title, slug, node_type, content, status, is_placeholder, category_id, image_path, characters(character_type, owner_id, avatar_path, illustration_path, profiles(display_name, username))",
    )
    .eq("world_id", world.id)
    .eq("slug", nodeSlug)
    .maybeSingle();
  if (!node) notFound();

  const character = unwrapRelation(node.characters);
  const characterOwner = character?.owner_id
    ? unwrapRelation(character.profiles)
    : null;

  const [
    { data: outboundLinks },
    { data: attachments },
    { data: sections },
    { data: characterFieldDefs },
    { data: characterFieldValues },
    { data: category },
    { data: timelineEvents },
    { data: relationships },
  ] = await Promise.all([
    supabase
      .from("wikilinks")
      .select(
        "raw_text, target:nodes!wikilinks_target_node_id_fkey(slug, is_placeholder)",
      )
      .eq("source_node_id", node.id),
    supabase
      .from("node_attachments")
      .select("id, file_name, kind, storage_path, is_spoiler, created_at")
      .eq("node_id", node.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("node_sections")
      .select("id, title, content, is_spoiler")
      .eq("node_id", node.id)
      .order("order_index", { ascending: true }),
    node.node_type === "character"
      ? supabase
          .from("world_character_fields")
          .select("id, label, character_type")
          .eq("world_id", world.id)
          .order("order_index", { ascending: true })
      : Promise.resolve({ data: null }),
    node.node_type === "character"
      ? supabase
          .from("character_field_values")
          .select("field_id, value")
          .eq("node_id", node.id)
      : Promise.resolve({ data: null }),
    node.category_id
      ? supabase
          .from("world_content_categories")
          .select("name")
          .eq("id", node.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    node.node_type === "character"
      ? supabase
          .from("character_timeline_events")
          .select("id, label, description, content, image_path, is_spoiler")
          .eq("node_id", node.id)
          .order("order_index", { ascending: true })
      : Promise.resolve({ data: null }),
    supabase
      .from("relationships")
      .select(
        "id, label, label_reverse, status, node_a:nodes!relationships_node_a_id_fkey(id, title, slug), node_b:nodes!relationships_node_b_id_fkey(id, title, slug)",
      )
      .eq("world_id", world.id)
      .or(`node_a_id.eq.${node.id},node_b_id.eq.${node.id}`)
      .order("created_at", { ascending: false }),
  ]);

  const valueByFieldId = new Map(
    (characterFieldValues ?? []).map((v) => [v.field_id, v.value]),
  );
  // 共用欄位(character_type 是 NULL)兩邊都出現,'pc'/'npc' 只在對應類型出現。
  const characterFields = (characterFieldDefs ?? [])
    .filter(
      (f) => f.character_type === null || f.character_type === character?.character_type,
    )
    .map((f) => ({
      id: f.id,
      label: f.label,
      value: valueByFieldId.get(f.id) ?? "",
    }));

  // wikilinks_select RLS 已經確保這裡拿到的 target 都是訪客看得到的節點
  // (rejected 的節點對非 creator/staff 一律不可見,不會出現在這裡)——
  // 不需要再額外用 status 收斂一次。
  const wikiLinkMap = new Map(
    (outboundLinks ?? [])
      .map((link) => {
        const target = unwrapRelation(link.target);
        return [link.raw_text, target] as const;
      })
      .filter(
        (entry): entry is [string, { slug: string; is_placeholder: boolean }] =>
          entry[1] != null,
      )
      .map(([rawText, target]) => [
        rawText,
        { slug: target.slug, isPlaceholder: target.is_placeholder },
      ] as const),
  );

  const attachmentUrls = await Promise.all(
    (attachments ?? []).map(async (a) => ({
      ...a,
      url:
        (await getAttachmentSignedUrl(
          a.storage_path,
          a.kind === "file" ? a.file_name : undefined,
        )) ?? "",
    })),
  );
  const imageMap = new Map(
    attachmentUrls
      .filter((a) => a.kind === "image")
      .map((a) => [
        a.id,
        { url: a.url, fileName: a.file_name, isSpoiler: a.is_spoiler },
      ]),
  );
  const fileAttachments = attachmentUrls.filter((a) => a.kind === "file");

  const [nodeImageUrl, characterAvatarUrl, characterIllustrationUrl] = await Promise.all([
    getNodeMediaSignedUrl(node.image_path),
    getNodeMediaSignedUrl(character?.avatar_path ?? null),
    getNodeMediaSignedUrl(character?.illustration_path ?? null),
  ]);

  const timelineEventItems = await Promise.all(
    (timelineEvents ?? []).map(async (e) => ({
      id: e.id,
      label: e.label,
      description: e.description,
      content: e.content,
      imageUrl: await getNodeMediaSignedUrl(e.image_path),
      isSpoiler: e.is_spoiler,
    })),
  );

  const isCharacter = node.node_type === "character" && character;
  const extraBadges = node.status === "pending" ? (
    <span className="rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg">
      {NODE_STATUS_LABEL[node.status]}
    </span>
  ) : undefined;
  const ownerLabel =
    isCharacter && character.character_type === "pc"
      ? characterOwner?.display_name || characterOwner?.username || "未知玩家"
      : null;

  const heroProps = {
    name: node.title,
    characterType: isCharacter ? character.character_type : null,
    extraBadges,
    nodeTypeLabel: NODE_TYPE_LABEL[node.node_type],
    categoryName: category?.name ?? null,
    ownerLabel,
    avatarUrl: isCharacter ? characterAvatarUrl : null,
    coverUrl: nodeImageUrl,
    // 節點內文現在改到下面的分頁裡顯示,橫幅不用重複一份引言。
    quote: null,
  };

  const tabs: NodeTab[] = [
    {
      key: "content",
      label: "主文",
      content: (
        <>
          {node.content ? (
            <WikiLinkContent
              content={node.content}
              basePath={`/worlds/${world.slug}/nodes`}
              links={wikiLinkMap}
              images={imageMap}
            />
          ) : (
            <p className="text-sm text-muted-foreground">還沒有內文。</p>
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

  if ((sections ?? []).length > 0) {
    tabs.push({
      key: "sections",
      label: "補充區塊",
      content: (
        <NodeSectionsEditor
          nodeId={node.id}
          worldSlug={world.slug}
          nodeSlug={node.slug}
          canEdit={false}
          sections={sections ?? []}
          hideHeading
        />
      ),
    });
  }

  if ((relationships ?? []).length > 0) {
    tabs.push({
      key: "relationships",
      label: "人際關係",
      content: (
        <NodeRelationshipList
          relationships={relationships ?? []}
          worldSlug={world.slug}
          currentNodeId={node.id}
        />
      ),
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 lg:max-w-5xl">
      <Link
        href={`/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>

      <div className="mt-2">
        <NodeHero {...heroProps} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:order-2 lg:col-span-4">
          <NodeInfobox
            nodeId={node.id}
            worldName={world.name}
            worldSlug={world.slug}
            nodeSlug={node.slug}
            nodeTypeLabel={NODE_TYPE_LABEL[node.node_type]}
            categoryName={category?.name ?? null}
            characterType={isCharacter ? character.character_type : null}
            extraBadges={extraBadges}
            ownerLabel={ownerLabel}
            avatarUrl={isCharacter ? characterAvatarUrl : null}
            coverUrl={nodeImageUrl}
            illustrationUrl={node.node_type === "character" ? characterIllustrationUrl : null}
            characterFields={characterFields}
          />
        </div>

        <div className="lg:order-1 lg:col-span-8 lg:min-w-0">
          <NodeTabs tabs={tabs} />
        </div>
      </div>
    </div>
  );
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
