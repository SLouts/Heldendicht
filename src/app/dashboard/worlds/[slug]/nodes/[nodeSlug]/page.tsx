import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getAttachmentSignedUrl } from "@/lib/attachments";
import { deleteNode, reviewNode } from "@/lib/actions/nodes";
import { EditNodeForm } from "./EditNodeForm";
import { WikiLinkContent } from "./WikiLinkContent";
import { AttachmentsSection, type AttachmentItem } from "./AttachmentsSection";
import { CharacterPersonaForm } from "./CharacterPersonaForm";
import { CharacterFieldsForm, CharacterFieldsDisplay } from "./CharacterFieldsForm";
import { NodeSectionsEditor } from "./NodeSectionsEditor";
import { NodeMediaUpload } from "./NodeMediaUpload";
import { ReportForm } from "@/components/ReportForm";
import { NODE_TYPE_LABEL } from "@/lib/nodeTypeLabels";
import { getNodeMediaSignedUrl } from "@/lib/nodeMedia";

const STATUS_LABEL: Record<string, string> = {
  pending: "未正式過審",
  approved: "已過審",
  rejected: "已駁回",
};

export default async function NodeDetailPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/nodes/[nodeSlug]">) {
  const { slug, nodeSlug } = await params;
  const user = await requireUser();
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
      "id, title, slug, node_type, content, status, edit_mode, is_placeholder, creator_id, category_id, image_path, characters(character_type, owner_id, persona_id, avatar_path, illustration_path, profiles(display_name, username, email))",
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
  const isPersonaOwner =
    character?.character_type === "pc" && character.owner_id === user.id;

  const [
    { data: isStaff },
    { data: isMember },
    { data: revisions },
    { data: outboundLinks },
    { data: attachments },
    { data: personas },
    { data: sections },
    { data: characterFieldDefs },
    { data: characterFieldValues },
    { data: categories },
  ] = await Promise.all([
    supabase.rpc("is_world_staff", { p_world_id: world.id }),
    supabase.rpc("is_world_member", { p_world_id: world.id }),
    supabase
      .from("node_revisions")
      .select("id, title, editor_id, created_at")
      .eq("node_id", node.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("wikilinks")
      .select(
        "raw_text, target:nodes!wikilinks_target_node_id_fkey(slug, is_placeholder)",
      )
      .eq("source_node_id", node.id),
    supabase
      .from("node_attachments")
      .select(
        "id, file_name, file_size, kind, storage_path, created_at, profiles(display_name, username, email)",
      )
      .eq("node_id", node.id)
      .order("created_at", { ascending: false }),
    isPersonaOwner
      ? supabase
          .from("character_personas")
          .select("id, name")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: null }),
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
    supabase
      .from("world_content_categories")
      .select("id, name, accepts_submissions")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
  ]);

  // 一般成員只能改選開放投稿的分類,或是節點目前已經掛著的那個分類
  // (即使那個分類後來被關閉,也不會因此把選項憑空拿掉、逼他們選別的)。
  const selectableCategories = (categories ?? []).filter(
    (c) => c.accepts_submissions || isStaff || c.id === node.category_id,
  );

  const valueByFieldId = new Map(
    (characterFieldValues ?? []).map((v) => [v.field_id, v.value]),
  );
  const characterFields = (characterFieldDefs ?? []).map((f) => ({
    id: f.id,
    label: f.label,
    value: valueByFieldId.get(f.id) ?? "",
  }));

  const wikiLinkMap = new Map(
    (outboundLinks ?? []).map((link) => {
      const target = Array.isArray(link.target) ? link.target[0] : link.target;
      return [
        link.raw_text,
        { slug: target?.slug ?? "", isPlaceholder: target?.is_placeholder ?? false },
      ] as const;
    }),
  );

  const isCreator = node.creator_id === user.id;
  const canEdit =
    Boolean(isStaff) ||
    isCreator ||
    (node.edit_mode === "collaborative" && Boolean(isMember));
  const canDelete = Boolean(isStaff) || (isCreator && node.status === "pending");

  const attachmentItems: AttachmentItem[] = await Promise.all(
    (attachments ?? []).map(async (a) => {
      const uploader = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
      const url =
        (await getAttachmentSignedUrl(
          a.storage_path,
          a.kind === "file" ? a.file_name : undefined,
        )) ?? "";
      return {
        id: a.id,
        fileName: a.file_name,
        fileSize: a.file_size,
        kind: a.kind,
        url,
        uploaderLabel:
          uploader?.display_name || uploader?.username || uploader?.email || "未知玩家",
        createdAt: a.created_at,
      };
    }),
  );
  const imageMap = new Map(
    attachmentItems
      .filter((a) => a.kind === "image")
      .map((a) => [a.id, { url: a.url, fileName: a.fileName }]),
  );

  const [nodeImageUrl, characterAvatarUrl, characterIllustrationUrl] = await Promise.all([
    getNodeMediaSignedUrl(node.image_path),
    getNodeMediaSignedUrl(character?.avatar_path ?? null),
    getNodeMediaSignedUrl(character?.illustration_path ?? null),
  ]);

  return (
    <div className="max-w-2xl">
      <Link
        href={`/dashboard/worlds/${world.slug}`}
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
        {node.status !== "approved" && (
          <span
            className={
              node.status === "rejected"
                ? "rounded-full bg-badge-danger-bg px-2 py-0.5 text-xs text-badge-danger-fg"
                : "rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg"
            }
          >
            {STATUS_LABEL[node.status]}
          </span>
        )}
        {node.is_placeholder && (
          <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
            WikiLink 自動建立的待撰寫節點
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {NODE_TYPE_LABEL[node.node_type]} ·{" "}
        {node.edit_mode === "collaborative" ? "開放共筆" : "僅自己可改"}
        {(() => {
          const category = categories?.find((c) => c.id === node.category_id);
          return category ? <> ・分類:{category.name}</> : null;
        })()}
        {character?.character_type === "pc" && (
          <>
            {" "}
            ·擁有者:
            {characterOwner?.display_name ||
              characterOwner?.username ||
              characterOwner?.email ||
              "未知玩家"}
          </>
        )}
      </p>

      {canEdit ? (
        <div className="mt-4 flex flex-wrap gap-6">
          <NodeMediaUpload
            kind="image"
            label="代表圖"
            nodeId={node.id}
            worldSlug={world.slug}
            nodeSlug={node.slug}
            imageUrl={nodeImageUrl}
            previewClassName="h-32 w-32 rounded-lg border border-border object-cover"
          />
          {node.node_type === "character" && (
            <>
              <NodeMediaUpload
                kind="avatar"
                label="頭貼"
                nodeId={node.id}
                worldSlug={world.slug}
                nodeSlug={node.slug}
                imageUrl={characterAvatarUrl}
                previewClassName="h-32 w-32 rounded-full border border-border object-cover"
              />
              <NodeMediaUpload
                kind="illustration"
                label="立繪"
                nodeId={node.id}
                worldSlug={world.slug}
                nodeSlug={node.slug}
                imageUrl={characterIllustrationUrl}
                previewClassName="h-56 w-auto rounded-lg border border-border object-cover"
              />
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-4">
          {characterAvatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={characterAvatarUrl}
              alt=""
              className="h-24 w-24 rounded-full border border-border object-cover"
            />
          )}
          {characterIllustrationUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={characterIllustrationUrl}
              alt=""
              className="h-56 w-auto rounded-lg border border-border object-cover"
            />
          )}
          {nodeImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
            <img
              src={nodeImageUrl}
              alt=""
              className="h-32 w-32 rounded-lg border border-border object-cover"
            />
          )}
        </div>
      )}

      {node.node_type === "character" &&
        (canEdit ? (
          <CharacterFieldsForm
            nodeId={node.id}
            worldSlug={world.slug}
            fields={characterFields}
          />
        ) : (
          <CharacterFieldsDisplay fields={characterFields} />
        ))}

      {isPersonaOwner && (
        <CharacterPersonaForm
          nodeId={node.id}
          worldSlug={world.slug}
          nodeSlug={node.slug}
          currentPersonaId={character?.persona_id ?? null}
          personas={personas ?? []}
        />
      )}

      {isStaff && node.status === "pending" && (
        <div className="mt-4 flex gap-2">
          <form action={reviewNode.bind(null, node.id, world.slug, node.slug, "approved")}>
            <button className="rounded-lg bg-success px-3 py-1.5 text-sm text-success-foreground transition hover:bg-success-hover">
              核准
            </button>
          </form>
          <form action={reviewNode.bind(null, node.id, world.slug, node.slug, "rejected")}>
            <button className="rounded-lg bg-danger px-3 py-1.5 text-sm text-danger-foreground transition hover:bg-danger-hover">
              駁回
            </button>
          </form>
        </div>
      )}

      <div className="mt-6">
        {canEdit ? (
          <EditNodeForm
            nodeId={node.id}
            worldSlug={world.slug}
            nodeSlug={node.slug}
            title={node.title}
            content={node.content}
            isPlaceholder={node.is_placeholder}
            nodeType={node.node_type}
            categories={selectableCategories}
            currentCategoryId={node.category_id}
          />
        ) : (
          <WikiLinkContent
            content={node.content}
            basePath={`/dashboard/worlds/${world.slug}/nodes`}
            links={wikiLinkMap}
            images={imageMap}
          />
        )}
      </div>

      <AttachmentsSection
        nodeId={node.id}
        worldSlug={world.slug}
        nodeSlug={node.slug}
        canEdit={canEdit}
        attachments={attachmentItems}
      />

      <NodeSectionsEditor
        nodeId={node.id}
        worldSlug={world.slug}
        nodeSlug={node.slug}
        canEdit={canEdit}
        sections={sections ?? []}
      />

      {canDelete && (
        <form
          action={deleteNode.bind(null, node.id, world.slug)}
          className="mt-6"
        >
          <button className="text-sm text-danger underline">
            刪除這個節點
          </button>
        </form>
      )}

      <ReportForm
        targetType="node"
        targetId={node.id}
        redirectPath={`/dashboard/worlds/${world.slug}/nodes/${node.slug}`}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold">版本歷史</h2>
        <ul className="mt-3 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          {revisions?.map((rev) => (
            <li key={rev.id} className="py-2 text-muted-foreground">
              {new Date(rev.created_at).toLocaleString("zh-TW")} · {rev.title}
            </li>
          ))}
          {revisions?.length === 0 && (
            <li className="py-2 text-muted-foreground">目前還沒有修改紀錄。</li>
          )}
        </ul>
      </section>
    </div>
  );
}
