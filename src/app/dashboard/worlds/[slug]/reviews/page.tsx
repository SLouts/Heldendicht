import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { NODE_TYPE_LABEL } from "@/lib/nodeTypeLabels";
import { ReviewQueueList, type ReviewQueueNode, type StubQueueNode } from "./ReviewQueueList";

function buildPreview(content: string): string {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > 140 ? `${flat.slice(0, 140)}…` : flat;
}

/**
 * 世界觀的審核佇列——列出所有未正式過審的節點(排除 WikiLink 自動建立、
 * 還沒補完類型/內文的待撰寫佔位節點,那些另外列在下面的「待撰寫」區塊,
 * 不能核准),可以個別或批次核准/駁回。通知鈴鐺的「N 個節點待審核」
 * 現在會直接連到這一頁,不再只是回到世界觀首頁。
 */
export default async function WorldReviewsPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/reviews">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: isStaff } = await supabase.rpc("is_world_staff", { p_world_id: world.id });

  if (!isStaff) {
    return (
      <div>
        <Link
          href={`/dashboard/worlds/${world.slug}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 返回世界觀
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          只有這個世界觀的主辦/編輯者能使用審核佇列。
        </p>
      </div>
    );
  }

  const { data: nodes } = await supabase
    .from("nodes")
    .select("id, title, slug, node_type, content, is_placeholder, creator_id, created_at")
    .eq("world_id", world.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const allNodes = nodes ?? [];
  // nodes.creator_id 沒有宣告外鍵(PostgREST 沒辦法直接 embed join),
  // 另外查一次建立者資料,用 id 對照回去。
  const creatorIds = [...new Set(allNodes.map((n) => n.creator_id))];
  const { data: creators } =
    creatorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, username, email")
          .in("id", creatorIds)
      : { data: [] };
  const creatorMap = new Map((creators ?? []).map((c) => [c.id, c]));
  const creatorLabel = (id: string) => {
    const c = creatorMap.get(id);
    return c?.display_name || c?.username || c?.email || "未知使用者";
  };

  const reviewNodes: ReviewQueueNode[] = [];
  const stubNodes: StubQueueNode[] = [];
  for (const n of allNodes) {
    if (n.is_placeholder) {
      stubNodes.push({
        id: n.id,
        title: n.title,
        slug: n.slug,
        creatorLabel: creatorLabel(n.creator_id),
        createdAt: n.created_at,
      });
    } else {
      reviewNodes.push({
        id: n.id,
        title: n.title,
        slug: n.slug,
        nodeTypeLabel: NODE_TYPE_LABEL[n.node_type],
        preview: buildPreview(n.content),
        creatorLabel: creatorLabel(n.creator_id),
        createdAt: n.created_at,
      });
    }
  }

  return (
    <div>
      <Link
        href={`/dashboard/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">審核佇列</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        列出所有未正式過審的節點,可以預覽內容並個別或批次核准/駁回。
      </p>

      <ReviewQueueList worldSlug={world.slug} nodes={reviewNodes} stubNodes={stubNodes} />
    </div>
  );
}
