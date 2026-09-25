import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getAttachmentSignedUrl } from "@/lib/attachments";
import { deleteNode } from "@/lib/actions/nodes";
import { NodeReviewForm } from "./NodeReviewForm";
import { EditNodeForm } from "./EditNodeForm";
import { WikiLinkContent } from "./WikiLinkContent";
import { AttachmentsSection, type AttachmentItem } from "./AttachmentsSection";
import { CharacterPersonaForm } from "./CharacterPersonaForm";
import { CharacterFieldsForm, CharacterFieldsDisplay } from "./CharacterFieldsForm";
import { CategoryFieldsForm, CategoryFieldsDisplay } from "./CategoryFieldsForm";
import { NodeSectionsEditor } from "./NodeSectionsEditor";
import { CharacterTimelineEditor } from "./CharacterTimelineEditor";
import { CharacterTimelineDisplay } from "./CharacterTimelineDisplay";
import { NodeMediaUpload } from "./NodeMediaUpload";
import { NodeHero } from "./NodeHero";
import { ReportForm } from "@/components/ReportForm";
import { NODE_TYPE_LABEL, NODE_STATUS_LABEL } from "@/lib/nodeTypeLabels";
import { getNodeMediaSignedUrl } from "@/lib/nodeMedia";
import { unwrapRelation } from "@/lib/unwrapRelation";

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
      "id, title, slug, node_type, content, status, edit_mode, is_placeholder, creator_id, category_id, image_path, review_note, characters(character_type, owner_id, persona_id, avatar_path, illustration_path, profiles(display_name, username, email))",
    )
    .eq("world_id", world.id)
    .eq("slug", nodeSlug)
    .maybeSingle();
  if (!node) notFound();

  const character = unwrapRelation(node.characters);
  const characterOwner = character?.owner_id
    ? unwrapRelation(character.profiles)
    : null;
  const isPersonaOwner =
    character?.character_type === "pc" && character.owner_id === user.id;

  const [
    { data: isStaff },
    { data: isMember },
    { data: creatorIsStaff },
    { data: revisions },
    { data: outboundLinks },
    { data: attachments },
    { data: personas },
    { data: sections },
    { data: characterFieldDefs },
    { data: characterFieldValues },
    { data: categories },
    { data: timelineEvents },
    { data: categoryFieldDefs },
    { data: categoryFieldValues },
  ] = await Promise.all([
    supabase.rpc("is_world_staff", { p_world_id: world.id }),
    supabase.rpc("is_world_member", { p_world_id: world.id }),
    supabase.rpc("creator_is_world_staff", {
      p_creator_id: node.creator_id,
      p_world_id: world.id,
    }),
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
        "id, file_name, file_size, kind, storage_path, is_spoiler, created_at, profiles(display_name, username, email)",
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
      .select("id, title, content, is_spoiler")
      .eq("node_id", node.id)
      .order("order_index", { ascending: true }),
    node.node_type === "character"
      ? supabase
          .from("world_character_fields")
          .select(
            "id, label, character_type, field_type, options, range_min, range_max, range_step",
          )
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
      .select("id, name, accepts_submissions, parent_id")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    node.node_type === "character"
      ? supabase
          .from("character_timeline_events")
          .select("id, label, description, content, image_path, is_spoiler")
          .eq("node_id", node.id)
          .order("order_index", { ascending: true })
      : Promise.resolve({ data: null }),
    node.category_id
      ? supabase
          .from("world_category_fields")
          .select(
            "id, label, is_required, field_type, options, range_min, range_max, range_step",
          )
          .eq("category_id", node.category_id)
          .order("order_index", { ascending: true })
      : Promise.resolve({ data: null }),
    node.category_id
      ? supabase
          .from("category_field_values")
          .select("field_id, value")
          .eq("node_id", node.id)
      : Promise.resolve({ data: null }),
  ]);

  // 一般成員只能改選開放投稿的分類,或是節點目前已經掛著的那個分類
  // (即使那個分類後來被關閉,也不會因此把選項憑空拿掉、逼他們選別的)。
  const selectableCategories = (categories ?? []).filter(
    (c) => c.accepts_submissions || isStaff || c.id === node.category_id,
  );

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
      fieldType: f.field_type,
      options: f.options,
      rangeMin: f.range_min,
      rangeMax: f.range_max,
      rangeStep: f.range_step,
    }));

  const valueByCategoryFieldId = new Map(
    (categoryFieldValues ?? []).map((v) => [v.field_id, v.value]),
  );
  const categoryFields = (categoryFieldDefs ?? []).map((f) => ({
    id: f.id,
    label: f.label,
    isRequired: f.is_required,
    value: valueByCategoryFieldId.get(f.id) ?? "",
    fieldType: f.field_type,
    options: f.options,
    rangeMin: f.range_min,
    rangeMax: f.range_max,
    rangeStep: f.range_step,
  }));

  const wikiLinkMap = new Map(
    (outboundLinks ?? []).map((link) => {
      const target = unwrapRelation(link.target);
      return [
        link.raw_text,
        { slug: target?.slug ?? "", isPlaceholder: target?.is_placeholder ?? false },
      ] as const;
    }),
  );

  const isCreator = node.creator_id === user.id;
  // staff「不管是誰建的都能改/刪」這個豁免,只適用在建立者自己也是
  // staff(admin/editor)的節點——一般 member 建立的節點,staff 只能審核
  // (核准/駁回/打回審核中),不能直接改內容或直接刪除。
  const canEdit =
    isCreator ||
    (node.edit_mode === "collaborative" && Boolean(isMember)) ||
    (Boolean(isStaff) && Boolean(creatorIsStaff));
  const canDelete =
    (Boolean(isStaff) && Boolean(creatorIsStaff)) ||
    (isCreator && node.status === "pending");

  const attachmentItems: AttachmentItem[] = await Promise.all(
    (attachments ?? []).map(async (a) => {
      const uploader = unwrapRelation(a.profiles);
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
        isSpoiler: a.is_spoiler,
      };
    }),
  );
  const imageMap = new Map(
    attachmentItems
      .filter((a) => a.kind === "image")
      .map((a) => [
        a.id,
        { url: a.url, fileName: a.fileName, isSpoiler: a.isSpoiler },
      ]),
  );

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

  const category = categories?.find((c) => c.id === node.category_id);
  const extraBadges =
    node.status !== "approved" || node.is_placeholder ? (
      <>
        {node.status !== "approved" && (
          <span
            className={
              node.status === "rejected"
                ? "rounded-full bg-badge-danger-bg px-2 py-0.5 text-xs text-badge-danger-fg"
                : "rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg"
            }
          >
            {NODE_STATUS_LABEL[node.status]}
          </span>
        )}
        {node.is_placeholder && (
          <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
            WikiLink 自動建立的待撰寫節點
          </span>
        )}
      </>
    ) : undefined;

  const isCharacter = node.node_type === "character" && character;
  const heroProps = {
    name: node.title,
    characterType: isCharacter ? character.character_type : null,
    extraBadges,
    nodeTypeLabel: `${NODE_TYPE_LABEL[node.node_type]} ・${node.edit_mode === "collaborative" ? "開放共筆" : "僅自己可改"}`,
    categoryName: category?.name ?? null,
    ownerLabel:
      isCharacter && character.character_type === "pc"
        ? characterOwner?.display_name ||
          characterOwner?.username ||
          characterOwner?.email ||
          "未知玩家"
        : null,
    avatarUrl: isCharacter ? characterAvatarUrl : null,
    coverUrl: nodeImageUrl,
    // 編輯者在下面的表單就看得到內文,橫幅不用重複顯示引言。
    quote: !canEdit && node.content ? (
      <blockquote className="mt-4 border-l-4 border-border pl-4 text-muted-foreground">
        <WikiLinkContent
          content={node.content}
          basePath={`/dashboard/worlds/${world.slug}/nodes`}
          links={wikiLinkMap}
          images={imageMap}
        />
      </blockquote>
    ) : null,
  };

  return (
    <div className="max-w-2xl lg:max-w-5xl">
      <Link
        href={`/dashboard/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>

      <div className="mt-2">
        <NodeHero {...heroProps} />
      </div>

      <div className="mt-6 lg:flex lg:items-start lg:gap-8">
        <div className="lg:w-72 lg:shrink-0">
          {canEdit && (
            <div className="mt-4 flex flex-wrap gap-6 lg:flex-col lg:items-center">
              <NodeMediaUpload
                kind="image"
                label={node.node_type === "character" ? "封面" : "代表圖"}
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

          {node.node_type === "character" && characterIllustrationUrl && (
            <div className="mt-4 flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">立繪</span>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
              <img
                src={characterIllustrationUrl}
                alt=""
                className="w-full rounded-lg border border-border"
              />
            </div>
          )}
        </div>

        <div className="mt-4 lg:mt-0 lg:min-w-0 lg:flex-1">
          {isPersonaOwner && (
            <CharacterPersonaForm
              nodeId={node.id}
              worldSlug={world.slug}
              nodeSlug={node.slug}
              currentPersonaId={character?.persona_id ?? null}
              personas={personas ?? []}
            />
          )}

          {(isCreator || isStaff) && node.review_note && (
            <p className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm">
              <span className="font-medium">審核意見:</span> {node.review_note}
            </p>
          )}

          {isStaff && (
            <NodeReviewForm
              nodeId={node.id}
              worldSlug={world.slug}
              nodeSlug={node.slug}
              status={node.status}
              existingNote={node.review_note}
            />
          )}

          {canEdit && (
            <div className="mt-6">
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
                isStaff={Boolean(isStaff)}
              />
            </div>
          )}

          {canEdit ? (
            <CategoryFieldsForm
              nodeId={node.id}
              worldSlug={world.slug}
              fields={categoryFields}
            />
          ) : (
            <CategoryFieldsDisplay fields={categoryFields} />
          )}

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

          {node.node_type === "character" && (
            <div className="mt-10">
              <CharacterTimelineDisplay events={timelineEventItems} />
            </div>
          )}

          {node.node_type === "character" && (
            <CharacterTimelineEditor
              nodeId={node.id}
              worldSlug={world.slug}
              nodeSlug={node.slug}
              canEdit={canEdit}
              events={timelineEventItems}
            />
          )}
        </div>
      </div>

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
