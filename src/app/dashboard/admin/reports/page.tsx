import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveReport } from "@/lib/actions/reports";
import { unwrapRelation } from "@/lib/unwrapRelation";
import { REPORT_REASON_CATEGORY_LABEL, REPORT_STATUS_LABEL as STATUS_LABEL } from "@/lib/reportLabels";

const STATUS_FILTERS = ["open", "resolved", "dismissed", "all"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type ReporterProfile = { display_name: string | null; username: string | null; email: string | null };

/**
 * 全站檢舉總覽——跟各世界觀自己的檢舉列表(/dashboard/worlds/[slug]/reports)
 * 邏輯一樣(reports.target_id 是多型欄位,沒有真正外鍵,分開查節點/關係線
 * 再組 target_id -> 世界觀的對照表),差別只在這裡不限定單一世界觀,
 * 給站務一次看到全站所有世界觀的檢舉。
 */
export default async function AdminReportsPage({
  searchParams,
}: PageProps<"/dashboard/admin/reports">) {
  const sp = await searchParams;
  const statusFilter: StatusFilter =
    typeof sp.status === "string" && STATUS_FILTERS.includes(sp.status as StatusFilter)
      ? (sp.status as StatusFilter)
      : "open";
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");

  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">全站檢舉總覽</h1>
      </div>
    );
  }

  const [{ data: nodes }, { data: relationships }, { data: reports }] = await Promise.all([
    supabase.from("nodes").select("id, title, slug, world:worlds(slug, name)"),
    supabase
      .from("relationships")
      .select(
        "id, world:worlds(slug, name), node_a:nodes!relationships_node_a_id_fkey(title), node_b:nodes!relationships_node_b_id_fkey(title)",
      ),
    supabase
      .from("reports")
      .select(
        "id, target_type, target_id, reason, reason_category, status, is_anonymous, created_at, reporter:profiles!reports_reporter_id_fkey(display_name, username, email)",
      )
      .order("created_at", { ascending: false }),
  ]);

  const nodeMap = new Map(
    (nodes ?? []).map((n) => [n.id, { title: n.title, slug: n.slug, world: unwrapRelation(n.world) }]),
  );
  const relMap = new Map(
    (relationships ?? []).map((r) => {
      const a = unwrapRelation(r.node_a);
      const b = unwrapRelation(r.node_b);
      const world = unwrapRelation(r.world);
      return [r.id, { label: `${a?.title ?? "?"} ↔ ${b?.title ?? "?"}`, world }] as const;
    }),
  );

  const allReports = reports ?? [];
  const filtered =
    statusFilter === "all" ? allReports : allReports.filter((r) => r.status === statusFilter);

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">全站檢舉總覽</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        跨所有世界觀的檢舉——要處理單一世界觀的檢舉,也可以直接到該世界觀自己的檢舉列表頁。
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <Link
            key={status}
            href={status === "open" ? "/dashboard/admin/reports" : `/dashboard/admin/reports?status=${status}`}
            className={
              "rounded-full px-3 py-1 text-xs " +
              (statusFilter === status
                ? "bg-primary text-primary-foreground"
                : "bg-badge-neutral-bg text-badge-neutral-fg hover:opacity-80")
            }
          >
            {status === "all" ? "全部" : STATUS_LABEL[status]}
          </Link>
        ))}
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {filtered.map((report) => {
          const reporter = unwrapRelation(report.reporter) as ReporterProfile | null;
          const target =
            report.target_type === "node" ? nodeMap.get(report.target_id) : relMap.get(report.target_id);
          const targetLabel =
            report.target_type === "node"
              ? (nodeMap.get(report.target_id)?.title ?? "(節點已刪除)")
              : (relMap.get(report.target_id)?.label ?? "(關係線已刪除)");
          const targetHref =
            report.target_type === "node" && nodeMap.get(report.target_id)?.world
              ? `/dashboard/worlds/${nodeMap.get(report.target_id)!.world!.slug}/nodes/${nodeMap.get(report.target_id)!.slug}`
              : null;
          const worldName = target?.world?.name ?? "(世界觀已刪除)";
          const worldSlug = target?.world?.slug;

          return (
            <li key={report.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
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
                {worldSlug && (
                  <Link
                    href={`/dashboard/worlds/${worldSlug}/reports`}
                    className="text-xs text-muted-foreground underline"
                  >
                    {worldName}
                  </Link>
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
                <span className="rounded-full bg-badge-info-bg px-2 py-0.5 text-xs text-badge-info-fg">
                  {REPORT_REASON_CATEGORY_LABEL[report.reason_category]}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm">{report.reason}</p>

              <p className="mt-2 text-xs text-muted-foreground">
                {/* 站務在這一頁一律看得到真實身分——檢舉人選的匿名只對世界觀
                    主辦/編輯生效,不影響站務,所以這裡不用判斷 is_anonymous。 */}
                {reporter?.display_name || reporter?.username || reporter?.email || "匿名"} 於{" "}
                {new Date(report.created_at).toLocaleString("zh-TW")} 檢舉
                {report.is_anonymous && (
                  <span className="ml-1 text-badge-pending-fg">(對主辦匿名)</span>
                )}
              </p>

              {report.status === "open" && (
                <div className="mt-3 flex gap-2">
                  <form action={resolveReport.bind(null, report.id, "/dashboard/admin/reports", "resolved")}>
                    <button className="rounded-lg bg-success px-3 py-1.5 text-sm text-success-foreground transition hover:bg-success-hover">
                      標記已處理
                    </button>
                  </form>
                  <form action={resolveReport.bind(null, report.id, "/dashboard/admin/reports", "dismissed")}>
                    <button className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
                      駁回(不處理)
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="text-sm text-muted-foreground">
            {statusFilter === "all" ? "目前沒有任何檢舉。" : `目前沒有${STATUS_LABEL[statusFilter]}的檢舉。`}
          </li>
        )}
      </ul>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/admin" className="text-sm text-muted-foreground hover:underline">
      ← 回站務首頁
    </Link>
  );
}
