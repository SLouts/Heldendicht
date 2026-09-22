import Link from "next/link";
import type { NodeStatus } from "@/lib/supabase/database.types";
import { NODE_STATUS_LABEL } from "@/lib/nodeTypeLabels";

export type PersonaNodeFieldItem = { id: string; label: string; value: string };

/** 世界觀節點分頁的右側資訊欄——這個化身在該世界觀的頭貼/立繪、審核狀態、
 * 世界觀傳送門、該世界觀自訂的角色欄位。同一個 persona 在不同世界觀可能
 * 長得不一樣(平行化身),所以頭貼/立繪刻意跟本尊(PersonaHero)分開顯示。 */
export function PersonaNodeSidebar({
  status,
  worldSlug,
  worldName,
  fields,
  avatarUrl,
  illustrationUrl,
}: {
  status: NodeStatus;
  worldSlug: string;
  worldName: string;
  fields: PersonaNodeFieldItem[];
  avatarUrl: string | null;
  illustrationUrl: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 text-sm">
      {(avatarUrl || illustrationUrl) && (
        <div className="flex flex-col items-center gap-2">
          {illustrationUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed 網址,無法用 next/image 白名單網域
            <img
              src={illustrationUrl}
              alt=""
              className="w-full rounded-lg border border-border object-cover"
            />
          ) : avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed 網址,無法用 next/image 白名單網域
            <img
              src={avatarUrl}
              alt=""
              className="h-20 w-20 rounded-full border border-border object-cover"
            />
          ) : null}
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground">審核狀態</p>
        {status === "pending" ? (
          <span className="mt-1 inline-block rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg">
            {NODE_STATUS_LABEL[status]}
          </span>
        ) : (
          <p className="mt-1">{NODE_STATUS_LABEL[status]}</p>
        )}
      </div>

      <div>
        <p className="text-xs text-muted-foreground">所屬世界觀</p>
        <Link
          href={`/worlds/${worldSlug}`}
          className="mt-1 inline-block font-medium underline hover:no-underline"
        >
          {worldName} →
        </Link>
      </div>

      {fields.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground">角色專屬數值</p>
          <dl className="mt-1 flex flex-col gap-1">
            {fields.map((f) => (
              <div key={f.id} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="text-right">{f.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
