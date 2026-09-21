import Link from "next/link";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { NODE_TYPE_LABEL, NODE_STATUS_LABEL } from "@/lib/nodeTypeLabels";
import type { Database } from "@/lib/supabase/database.types";

export type RecentChangeNode = Pick<
  Database["public"]["Tables"]["nodes"]["Row"],
  "id" | "title" | "slug" | "node_type" | "status" | "updated_at"
>;

/**
 * 「近期變更」分頁——依 updated_at 排序最近變動的節點。跟其他分頁一樣
 * 不額外用 status='approved' 收斂,可見度交給 RLS;pending 節點一樣會
 * 出現,只是掛上「待審核」徽章——跟節點目錄清單同一套「顯示但標示狀態」
 * 的慣例,不是直接隱藏未過審的內容。
 */
export function WorldRecentChangesTab({
  nodes,
  worldSlug,
}: {
  nodes: RecentChangeNode[] | null | undefined;
  worldSlug: string;
}) {
  if (!nodes || nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">目前還沒有任何變更紀錄。</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {nodes.map((node) => (
        <li key={node.id} className="py-3">
          {node.status !== "rejected" ? (
            <Link
              href={`/worlds/${worldSlug}/nodes/${node.slug}`}
              className="flex flex-wrap items-center gap-2 hover:underline"
            >
              <NodeRow node={node} />
            </Link>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <NodeRow node={node} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function NodeRow({ node }: { node: RecentChangeNode }) {
  return (
    <>
      <span className="rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg">
        {NODE_TYPE_LABEL[node.node_type]}
      </span>
      <span className="font-medium">{node.title}</span>
      <span className="text-xs text-muted-foreground">{formatRelativeTime(node.updated_at)}</span>
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
    </>
  );
}
