import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAttachmentSignedUrl } from "@/lib/attachments";
import { WikiLinkContent } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/WikiLinkContent";
import { NodeSectionsEditor } from "@/app/dashboard/worlds/[slug]/nodes/[nodeSlug]/NodeSectionsEditor";

const NODE_TYPE_LABEL: Record<string, string> = {
  location: "地點",
  item: "物產",
  character: "角色",
  unspecified: "尚未分類(待撰寫)",
};

/**
 * 公開版節點頁面——只有 status = 'approved' 的條目才能被點開檢視,
 * pending/rejected 一律 404(RLS 本身還是會讓 anon 讀到 pending 節點的
 * metadata,例如 /worlds/[slug] 的列表會顯示「未正式過審」,但這裡故意
 * 用 .eq("status", "approved") 額外收斂一次,讓「還沒過審的內容不能被
 * 直接點開看全文」變成這個頁面自己保證的規則,不只是靠 UI 上不給連結)。
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
      "id, title, slug, node_type, content, is_placeholder, characters(character_type, owner_id, profiles(display_name, username))",
    )
    .eq("world_id", world.id)
    .eq("slug", nodeSlug)
    .eq("status", "approved")
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

  const [{ data: outboundLinks }, { data: attachments }, { data: sections }] =
    await Promise.all([
      supabase
        .from("wikilinks")
        .select(
          "raw_text, target:nodes!wikilinks_target_node_id_fkey(slug, is_placeholder, status)",
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
    ]);

  // 只把「目標本身也是過審狀態」的 WikiLink 收進地圖裡——指向 pending/
  // rejected 節點的連結不給點,呈現方式跟「找不到節點」一樣退回純文字,
  // 避免公開頁面出現點了會 404 的死連結。
  const wikiLinkMap = new Map(
    (outboundLinks ?? [])
      .map((link) => {
        const target = Array.isArray(link.target) ? link.target[0] : link.target;
        return [link.raw_text, target] as const;
      })
      .filter(
        (entry): entry is [string, { slug: string; is_placeholder: boolean; status: string }] =>
          entry[1]?.status === "approved",
      )
      .map(([rawText, target]) => [
        rawText,
        { slug: target.slug, isPlaceholder: target.is_placeholder },
      ]),
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
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {NODE_TYPE_LABEL[node.node_type]}
        {character?.character_type === "pc" && (
          <>
            {" "}
            ·擁有者:
            {characterOwner?.display_name || characterOwner?.username || "未知玩家"}
          </>
        )}
      </p>

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
