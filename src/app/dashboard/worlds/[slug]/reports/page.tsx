import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveReport } from "@/lib/actions/reports";

const STATUS_LABEL: Record<string, string> = {
  open: "待處理",
  resolved: "已處理",
  dismissed: "已駁回",
};

type ReporterProfile = { display_name: string | null; username: string | null; email: string | null };

export default async function WorldReportsPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/reports">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: isStaff } = await supabase.rpc("is_world_staff", {
    p_world_id: world.id,
  });

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
          只有這個世界觀的主辦/編輯者能查看檢舉列表。
        </p>
      </div>
    );
  }

  // reports.target_id 是多型欄位(可能指向 nodes 或 relationships),沒有真正的外鍵,
  // PostgREST 沒辦法直接 embed join,所以分開查「這個世界觀有哪些節點/關係線」,
  // 再各自去 reports 表用 target_id in (...) 篩選,而不是仰賴 RLS 的可見範圍
  // ——RLS 只保證「你看得到的檢舉都跟你的世界觀有關」,不保證「只有這個世界觀」。
  const [{ data: nodes }, { data: relationships }] = await Promise.all([
    supabase.from("nodes").select("id, title, slug").eq("world_id", world.id),
    supabase
      .from("relationships")
      .select(
        "id, node_a:nodes!relationships_node_a_id_fkey(title), node_b:nodes!relationships_node_b_id_fkey(title)",
      )
      .eq("world_id", world.id),
  ]);

  const nodeMap = new Map((nodes ?? []).map((n) => [n.id, n]));
  const relMap = new Map(
    (relationships ?? []).map((r) => {
      const a = Array.isArray(r.node_a) ? r.node_a[0] : r.node_a;
      const b = Array.isArray(r.node_b) ? r.node_b[0] : r.node_b;
      return [r.id, `${a?.title ?? "?"} ↔ ${b?.title ?? "?"}`] as const;
    }),
  );

  const nodeIds = [...nodeMap.keys()];
  const relIds = [...relMap.keys()];

  const [nodeReports, relReports] = await Promise.all([
    nodeIds.length > 0
      ? supabase
          .from("reports")
          .select(
            "id, target_type, target_id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(display_name, username, email)",
          )
          .eq("target_type", "node")
          .in("target_id", nodeIds)
      : Promise.resolve({ data: [] }),
    relIds.length > 0
      ? supabase
          .from("reports")
          .select(
            "id, target_type, target_id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(display_name, username, email)",
          )
          .eq("target_type", "relationship")
          .in("target_id", relIds)
      : Promise.resolve({ data: [] }),
  ]);

  const reports = [...(nodeReports.data ?? []), ...(relReports.data ?? [])].sort(
    (a, b) => (a.created_at < b.created_at ? 1 : -1),
  );

  return (
    <div>
      <Link
        href={`/dashboard/worlds/${world.slug}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← 返回世界觀
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">檢舉列表</h1>

      <ul className="mt-6 flex flex-col gap-3">
        {reports.map((report) => {
          const reporter = (
            Array.isArray(report.reporter) ? report.reporter[0] : report.reporter
          ) as ReporterProfile | null;
          const targetLabel =
            report.target_type === "node"
              ? (nodeMap.get(report.target_id)?.title ?? "(節點已刪除)")
              : (relMap.get(report.target_id) ?? "(關係線已刪除)");
          const targetHref =
            report.target_type === "node"
              ? nodeMap.get(report.target_id)
                ? `/dashboard/worlds/${world.slug}/nodes/${nodeMap.get(report.target_id)!.slug}`
                : null
              : relMap.get(report.target_id)
                ? `/dashboard/worlds/${world.slug}/relationships/${report.target_id}`
                : null;

          return (
            <li
              key={report.id}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground">
                  {report.target_type === "node" ? "節點" : "關係線"}
                </span>
                {targetHref ? (
                  <Link href={targetHref} className="font-medium hover:underline">
                    {targetLabel}
                  </Link>
                ) : (
                  <span className="font-medium text-muted-foreground">{targetLabel}</span>
                )}
                <span
                  className={
                    report.status === "open"
                      ? "rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg"
                      : "rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg"
                  }
                >
                  {STATUS_LABEL[report.status]}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm">{report.reason}</p>

              <p className="mt-2 text-xs text-muted-foreground">
                {reporter?.display_name || reporter?.username || reporter?.email || "匿名"}{" "}
                於 {new Date(report.created_at).toLocaleString("zh-TW")} 檢舉
              </p>

              {report.status === "open" && (
                <div className="mt-3 flex gap-2">
                  <form
                    action={resolveReport.bind(null, report.id, world.slug, "resolved")}
                  >
                    <button className="rounded-lg bg-success px-3 py-1.5 text-sm text-success-foreground transition hover:bg-success-hover">
                      標記已處理
                    </button>
                  </form>
                  <form
                    action={resolveReport.bind(null, report.id, world.slug, "dismissed")}
                  >
                    <button className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
                      駁回(不處理)
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
        {reports.length === 0 && (
          <li className="text-sm text-muted-foreground">目前沒有任何檢舉。</li>
        )}
      </ul>
    </div>
  );
}
