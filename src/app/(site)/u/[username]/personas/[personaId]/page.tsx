import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileMediaPublicUrl } from "@/lib/profileMedia";
import { getNodeMediaSignedUrl } from "@/lib/nodeMedia";
import { getAttachmentSignedUrl } from "@/lib/attachments";
import { unwrapRelation } from "@/lib/unwrapRelation";
import { NodeContentPanel } from "@/components/NodeContentPanel";
import type { NodeTab } from "@/app/(site)/worlds/[slug]/nodes/[nodeSlug]/NodeTabs";
import type { PersonaField } from "@/lib/actions/personas";
import { PersonaHero } from "./PersonaHero";
import { PersonaTabBar } from "./PersonaTabBar";
import { PersonaTabLayout } from "./PersonaTabLayout";
import { PersonaCoreTab } from "./PersonaCoreTab";
import { PersonaNodeSidebar } from "./PersonaNodeSidebar";

/**
 * 跨世界觀 PC persona 的獨立完整展示頁——比 /u/[username] 上那張摘要卡片
 * 更完整:「本尊核心」分頁顯示 persona 本身的 fields/bio,其餘分頁各自
 * 對應一個世界觀節點(化身),重用既有節點頁的 NodeContentPanel 呈現
 * 專屬內文/時間軸/人際關係——跟一般節點頁看到的內容完全一致,只是換一個
 * 入口跨世界觀瀏覽同一個角色的所有化身。
 *
 * 可見度完全交給既有的 RLS 在 join 查詢時自然過濾:persona 本身整表公開,
 * 但底下掛的世界觀節點是否出現在分頁列,由 nodes_select_visible(私人
 * 世界觀非成員、rejected 節點)決定,這裡不重複判斷一次。
 */
export default async function PersonaDetailPage({
  params,
}: PageProps<"/u/[username]/personas/[personaId]">) {
  const { username, personaId } = await params;
  const supabase = await createClient();

  const { data: owner } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();
  if (!owner) notFound();

  const { data: persona } = await supabase
    .from("character_personas")
    .select("id, name, tagline, bio, fields, avatar_path")
    .eq("id", personaId)
    .eq("owner_id", owner.id)
    .maybeSingle();
  if (!persona) notFound();

  const { data: linkRows } = await supabase
    .from("characters")
    .select(
      "avatar_path, illustration_path, nodes(id, slug, title, status, content, world_id, category_id, worlds(slug, name))",
    )
    .eq("persona_id", persona.id);

  const links = (linkRows ?? [])
    .map((row) => {
      const node = unwrapRelation(row.nodes);
      if (!node) return null;
      const world = unwrapRelation(node.worlds);
      if (!world) return null;
      return {
        node,
        world,
        avatarPath: row.avatar_path,
        illustrationPath: row.illustration_path,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  const nodeIds = links.map((l) => l.node.id);
  const worldIds = [...new Set(links.map((l) => l.node.world_id))];
  const categoryIds = [
    ...new Set(links.map((l) => l.node.category_id).filter((id): id is string => id != null)),
  ];

  const [
    { data: wikilinkRows },
    { data: attachmentRows },
    { data: sectionRows },
    { data: timelineRows },
    { data: relationshipRows },
    { data: fieldValueRows },
    { data: fieldDefRows },
    { data: categoryFieldValueRows },
    { data: categoryFieldDefRows },
  ] =
    // .in() 帶空陣列時 PostgREST 直接回傳空結果(不會出錯),所以這裡不用
    // 為了「這個 persona 還沒連結任何節點」的情況另外寫一套 fallback 型別,
    // 一律照常送出查詢即可。
    await Promise.all([
      supabase
        .from("wikilinks")
        .select(
          "source_node_id, raw_text, target:nodes!wikilinks_target_node_id_fkey(slug, is_placeholder)",
        )
        .in("source_node_id", nodeIds),
      supabase
        .from("node_attachments")
        .select("id, node_id, file_name, kind, storage_path, is_spoiler")
        .in("node_id", nodeIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("node_sections")
        .select("id, node_id, title, content, is_spoiler")
        .in("node_id", nodeIds)
        .order("order_index", { ascending: true }),
      supabase
        .from("character_timeline_events")
        .select("id, node_id, label, description, content, image_path, is_spoiler")
        .in("node_id", nodeIds)
        .order("order_index", { ascending: true }),
      nodeIds.length > 0
        ? supabase
            .from("relationships")
            .select(
              "id, node_a_id, node_b_id, label, label_reverse, status, node_a:nodes!relationships_node_a_id_fkey(id, title, slug), node_b:nodes!relationships_node_b_id_fkey(id, title, slug)",
            )
            .or(`node_a_id.in.(${nodeIds.join(",")}),node_b_id.in.(${nodeIds.join(",")})`)
            .order("created_at", { ascending: false })
        : supabase.from("relationships").select(
            "id, node_a_id, node_b_id, label, label_reverse, status, node_a:nodes!relationships_node_a_id_fkey(id, title, slug), node_b:nodes!relationships_node_b_id_fkey(id, title, slug)",
          ).eq("id", "00000000-0000-0000-0000-000000000000"),
      supabase
        .from("character_field_values")
        .select("node_id, field_id, value")
        .in("node_id", nodeIds),
      supabase
        .from("world_character_fields")
        .select("id, label, character_type, world_id")
        .in("world_id", worldIds)
        .order("order_index", { ascending: true }),
      supabase
        .from("category_field_values")
        .select("node_id, field_id, value")
        .in("node_id", nodeIds),
      supabase
        .from("world_category_fields")
        .select("id, label, is_required, category_id")
        .in("category_id", categoryIds)
        .order("order_index", { ascending: true }),
    ]);

  const avatarUrl = getProfileMediaPublicUrl(persona.avatar_path);

  // 依 node_id 分組每種資料,批次查完後在記憶體裡組成每個分頁要用的形狀,
  // 不對每個節點各自打一輪查詢(避免 N+1)。
  const wikiLinkMapByNode = new Map<string, Map<string, { slug: string; isPlaceholder: boolean }>>();
  for (const row of wikilinkRows ?? []) {
    const target = unwrapRelation(row.target);
    if (!target) continue;
    const map = wikiLinkMapByNode.get(row.source_node_id) ?? new Map();
    map.set(row.raw_text, { slug: target.slug, isPlaceholder: target.is_placeholder });
    wikiLinkMapByNode.set(row.source_node_id, map);
  }

  const attachmentsByNode = new Map<string, NonNullable<typeof attachmentRows>>();
  for (const row of attachmentRows ?? []) {
    const list = attachmentsByNode.get(row.node_id) ?? [];
    list.push(row);
    attachmentsByNode.set(row.node_id, list);
  }

  const sectionsByNode = new Map<string, NonNullable<typeof sectionRows>>();
  for (const row of sectionRows ?? []) {
    const list = sectionsByNode.get(row.node_id) ?? [];
    list.push(row);
    sectionsByNode.set(row.node_id, list);
  }

  const timelineByNode = new Map<string, NonNullable<typeof timelineRows>>();
  for (const row of timelineRows ?? []) {
    const list = timelineByNode.get(row.node_id) ?? [];
    list.push(row);
    timelineByNode.set(row.node_id, list);
  }

  const relationshipsByNode = new Map<string, NonNullable<typeof relationshipRows>>();
  for (const row of relationshipRows ?? []) {
    for (const nid of [row.node_a_id, row.node_b_id]) {
      if (!nodeIds.includes(nid)) continue;
      const list = relationshipsByNode.get(nid) ?? [];
      list.push(row);
      relationshipsByNode.set(nid, list);
    }
  }

  const fieldValuesByNode = new Map<string, Map<string, string>>();
  for (const row of fieldValueRows ?? []) {
    const map = fieldValuesByNode.get(row.node_id) ?? new Map();
    map.set(row.field_id, row.value);
    fieldValuesByNode.set(row.node_id, map);
  }

  const fieldDefsByWorld = new Map<string, NonNullable<typeof fieldDefRows>>();
  for (const row of fieldDefRows ?? []) {
    const list = fieldDefsByWorld.get(row.world_id) ?? [];
    list.push(row);
    fieldDefsByWorld.set(row.world_id, list);
  }

  const categoryFieldValuesByNode = new Map<string, Map<string, string>>();
  for (const row of categoryFieldValueRows ?? []) {
    const map = categoryFieldValuesByNode.get(row.node_id) ?? new Map();
    map.set(row.field_id, row.value);
    categoryFieldValuesByNode.set(row.node_id, map);
  }

  const categoryFieldDefsByCategory = new Map<string, NonNullable<typeof categoryFieldDefRows>>();
  for (const row of categoryFieldDefRows ?? []) {
    const list = categoryFieldDefsByCategory.get(row.category_id) ?? [];
    list.push(row);
    categoryFieldDefsByCategory.set(row.category_id, list);
  }

  const tabs: NodeTab[] = [
    {
      key: "core",
      label: "本尊核心",
      content: (
        <PersonaTabLayout
          main={
            <PersonaCoreTab
              fields={(Array.isArray(persona.fields) ? persona.fields : []) as PersonaField[]}
              bio={persona.bio}
            />
          }
          sidebar={
            <div className="rounded-lg border border-border bg-surface p-4 text-sm">
              <p className="text-xs text-muted-foreground">登場世界觀</p>
              {links.length === 0 ? (
                <p className="mt-1 text-muted-foreground">目前還沒有任何世界觀化身。</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-1">
                  {links.map((l) => (
                    <li key={l.node.id}>
                      {l.node.title} · {l.world.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          }
        />
      ),
    },
  ];

  for (const link of links) {
    const { node, world } = link;

    const [nodeAvatarUrl, nodeIllustrationUrl] = await Promise.all([
      getNodeMediaSignedUrl(link.avatarPath),
      getNodeMediaSignedUrl(link.illustrationPath),
    ]);

    const attachments = attachmentsByNode.get(node.id) ?? [];
    const attachmentUrls = await Promise.all(
      attachments.map(async (a) => ({
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
        .map((a) => [a.id, { url: a.url, fileName: a.file_name, isSpoiler: a.is_spoiler }]),
    );
    const fileAttachments = attachmentUrls.filter((a) => a.kind === "file");

    const timelineEventItems = await Promise.all(
      (timelineByNode.get(node.id) ?? []).map(async (e) => ({
        id: e.id,
        label: e.label,
        description: e.description,
        content: e.content,
        imageUrl: await getNodeMediaSignedUrl(e.image_path),
        isSpoiler: e.is_spoiler,
      })),
    );

    const fieldValues = fieldValuesByNode.get(node.id) ?? new Map<string, string>();
    // 共用欄位(character_type 是 NULL)+ PC 專屬欄位都要出現(persona 只有
    // PC 能連,見 chk_persona_only_pc),不用再依 character_type 篩一次。
    const characterFields = (fieldDefsByWorld.get(node.world_id) ?? [])
      .filter((f) => f.character_type === null || f.character_type === "pc")
      .map((f) => ({ id: f.id, label: f.label, value: fieldValues.get(f.id) ?? "" }));

    const categoryFieldValues =
      categoryFieldValuesByNode.get(node.id) ?? new Map<string, string>();
    const categoryFields = node.category_id
      ? (categoryFieldDefsByCategory.get(node.category_id) ?? []).map((f) => ({
          id: f.id,
          label: f.label,
          isRequired: f.is_required,
          value: categoryFieldValues.get(f.id) ?? "",
        }))
      : [];

    tabs.push({
      key: node.id,
      label: `${node.title} · ${world.name}`,
      content: (
        <PersonaTabLayout
          main={
            <NodeContentPanel
              nodeId={node.id}
              nodeContent={node.content}
              worldSlug={world.slug}
              wikiLinkMap={wikiLinkMapByNode.get(node.id) ?? new Map()}
              imageMap={imageMap}
              fileAttachments={fileAttachments}
              sections={sectionsByNode.get(node.id) ?? []}
              timelineEventItems={timelineEventItems}
              relationships={relationshipsByNode.get(node.id) ?? []}
              categoryFields={categoryFields}
            />
          }
          sidebar={
            <PersonaNodeSidebar
              status={node.status}
              worldSlug={world.slug}
              worldName={world.name}
              fields={characterFields}
              avatarUrl={nodeAvatarUrl}
              illustrationUrl={nodeIllustrationUrl}
            />
          }
        />
      ),
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Link
        href={`/u/${username}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回 {owner.display_name || owner.username} 的個人頁
      </Link>

      <div className="mt-4">
        <PersonaHero
          name={persona.name}
          tagline={persona.tagline}
          avatarUrl={avatarUrl}
          ownerUsername={owner.username}
          ownerLabel={owner.display_name || owner.username || "未知玩家"}
        />
      </div>

      <div className="mt-6">
        <PersonaTabBar tabs={tabs} />
      </div>
    </div>
  );
}
