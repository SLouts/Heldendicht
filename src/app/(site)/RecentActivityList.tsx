import Link from "next/link";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { NODE_TYPE_LABEL } from "@/lib/nodeTypeLabels";
import type { NodeType } from "@/lib/supabase/database.types";

export type RecentActivityItem = {
  id: string;
  title: string;
  nodeSlug: string;
  nodeType: NodeType;
  worldName: string;
  worldSlug: string;
  updaterLabel: string;
  updatedAt: string;
};

/** 首頁「全站最新動態」——最近更新的公開節點清單,點擊直達節點詳細頁。 */
export function RecentActivityList({ items }: { items: RecentActivityItem[] }) {
  if (items.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">目前還沒有任何動態。</p>;
  }

  return (
    <ul className="mt-4 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/worlds/${item.worldSlug}/nodes/${item.nodeSlug}`}
            className="flex flex-wrap items-center gap-2 p-4 transition hover:bg-background"
          >
            <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
              {NODE_TYPE_LABEL[item.nodeType]}
            </span>
            <span className="font-medium">{item.title}</span>
            <span className="text-sm text-muted-foreground">・{item.worldName}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {item.updaterLabel} 更新・{formatRelativeTime(item.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
