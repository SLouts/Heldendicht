import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAttachmentSignedUrl } from "@/lib/attachments";
import { WikiLinkContent } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/WikiLinkContent";
import { NodeSectionsEditor } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/NodeSectionsEditor";
import { CharacterFieldsDisplay } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/CharacterFieldsForm";
import { NODE_TYPE_LABEL } from "@/lib/nodeTypeLabels";

const STATUS_LABEL: Record<string, string> = {
  pending: "未正式過審",
};

/**
 * 公開版節點頁面——可見度完全交給 nodes_select_visible RLS
 * (status <> 'rejected' + can_view_world_content),跟登入後的一般成員
 * 看到的範圍一致,不另外用 status='approved' 收斂一次:未登入訪客跟
 * 登入後唯一的差異只有「不能建立/編輯」,不是能看到多少內容。
 * 純唯讀,不含審核/編輯/上傳/檢舉這些後台操作。
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
      "id, title, slug, node_type, content, status, is_placeholder, category_id, characters(character_type, owner_id, profiles(display_name, username))",
    )
    .eq("world_id", world.id)
    .eq("slug", nodeSlug)
    .maybeSingle();
  if (!node) notFound();

  const character = Array.isArray(node.characters)
    ? node.characters[0]
    : node.characters;
  const characterOwner = character?.owner_id
    ? Array.isArray(character.profiles)
      ? character.profiles[0]
      : character.profiles
    : null;

  const [
    { data: outboundLinks },
    { data: attachments },
    { data: sections },
    { data: characterFieldDefs },
    { data: characterFieldValues },
    { data: category },
  ] = await Promise.all([
    supabase
      .from("wikilinks")
      .select(
        "raw_text, target:nodes!wikilinks_target_node_id_fkey(slug, is_placeholder)",
      )
      .eq("source_node_id", node.id),
    supabase
      .from("node_attachments")
      .select("id, file_name, kind, storage_path, created_at")
      .eq("node_id", node.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("node_sections")
      .select("id, title, content")
      .eq("node_id", node.id)
      .order("order_index", { ascending: true }),
    node.node_type === "character"
      ? supabase
          .from("world_character_fields")
          .select("id, label")
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
  ]);

  const valueByFieldId = new Map(
    (characterFieldValues ?? []).map((v) => [v.field_id, v.value]),
  );
  const characterFields = (characterFieldDefs ?? []).map((f) => ({
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
        const target = Array.isArray(link.target) ? link.target[0] : link.target;
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
      .map((a) => [a.id, { url: a.url, fileName: a.file_name }]),
  );
  const fileAttachments = attachmentUrls.filter((a) => a.kind === "file");

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link
        href={`/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{node.title}</h1>
        {character && (
          <span
            className={
              character.character_type === "pc"
                ? "rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg"
                : "rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg"
            }
          >
            {character.character_type === "pc" ? "PC" : "NPC"}
          </span>
        )}
        {STATUS_LABEL[node.status] && (
          <span className="rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg">
            {STATUS_LABEL[node.status]}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {NODE_TYPE_LABEL[node.node_type]}
        {category && <> ・分類:{category.name}</>}
        {character?.character_type === "pc" && (
          <>
            {" "}
            ·擁有者:
            {characterOwner?.display_name || characterOwner?.username || "未知玩家"}
          </>
        )}
      </p>

      {node.node_type === "character" && (
        <CharacterFieldsDisplay fields={characterFields} />
      )}

      <div className="mt-6">
        <WikiLinkContent
          content={node.content}
          basePath={`/worlds/${world.slug}/nodes`}
          links={wikiLinkMap}
          images={imageMap}
        />
      </div>

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

      <NodeSectionsEditor
        nodeId={node.id}
        worldSlug={world.slug}
        nodeSlug={node.slug}
        canEdit={false}
        sections={sections ?? []}
      />
    </div>
  );
}
