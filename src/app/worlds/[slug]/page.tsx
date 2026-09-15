import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WorldPage({
  params,
}: PageProps<"/worlds/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, name, tagline, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!world) {
    // RLS 會讓「不存在」跟「存在但你看不到(私有世界觀非成員)」回傳一樣的結果,
    // 這是刻意的 —— 不會洩漏「這個世界觀其實存在,只是你不能看」的資訊。
    notFound();
  }

  // status <> 'rejected' 由 RLS 自動過濾,這裡不用重複判斷可見度,
  // 只需要在畫面上把 pending 的節點標成「未正式過審」。
  const { data: nodes } = await supabase
    .from("nodes")
    .select("id, title, slug, node_type, status, is_placeholder")
    .eq("world_id", world.id)
    .order("node_type");

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{world.name}</h1>
      {world.tagline && (
        <p className="mt-2 text-muted-foreground">{world.tagline}</p>
      )}
      {world.description && (
        <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
          {world.description}
        </p>
      )}

      <h2 className="mt-10 text-xl font-semibold">節點</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        只有已經過審的條目可以點開檢視;未正式過審的內容還在編修中,先不開放閱讀全文。
      </p>
      <ul className="mt-4 divide-y divide-border">
        {nodes?.map((node) => {
          const titleSpan = (
            <span
              className={node.is_placeholder ? "text-muted-foreground italic" : ""}
            >
              {node.title}
            </span>
          );
          return (
            <li key={node.id} className="flex items-center gap-2 py-3">
              <span className="text-xs text-muted-foreground">{node.node_type}</span>
              {node.status === "approved" ? (
                <Link
                  href={`/worlds/${slug}/nodes/${node.slug}`}
                  className="hover:underline"
                >
                  {titleSpan}
                </Link>
              ) : (
                titleSpan
              )}
              {node.status === "pending" && (
                <span className="rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg">
                  未正式過審
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
        {nodes?.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">目前還沒有節點。</li>
        )}
      </ul>
    </div>
  );
}
