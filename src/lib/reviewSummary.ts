import type { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ReviewWorldSummary = {
  worldSlug: string;
  worldName: string;
  pendingNodesCount: number;
  stubNodesCount: number;
  openReportsCount: number;
};

export type ReviewSummary = {
  worlds: ReviewWorldSummary[];
  pendingNodesTotal: number;
  stubNodesTotal: number;
  openReportsTotal: number;
};

/**
 * 算出目前使用者身為 staff(admin/editor)的每個世界觀,有多少「待審核」
 * 項目——節點審核(排除 WikiLink 自動建立、還沒補完類型/內文的待撰寫
 * 佔位節點,那些算另一類「待撰寫」,不是真的需要 staff 審核的項目)+
 * 未結案檢舉。後台首頁的卡片、頁首通知鈴鐺都呼叫這份共用邏輯,避免兩邊
 * 各自查詢算出不一致的數字。
 */
export async function getStaffReviewSummary(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ReviewSummary> {
  const { data: staffMemberships } = await supabase
    .from("world_memberships")
    .select("world_id, world:worlds(slug, name)")
    .eq("user_id", userId)
    .in("role", ["admin", "editor"]);

  const staffWorlds = (staffMemberships ?? [])
    .map((m) => {
      const world = unwrapRelation(m.world);
      return world ? { id: m.world_id, slug: world.slug, name: world.name } : null;
    })
    .filter((w): w is { id: string; slug: string; name: string } => w !== null);

  if (staffWorlds.length === 0) {
    return { worlds: [], pendingNodesTotal: 0, stubNodesTotal: 0, openReportsTotal: 0 };
  }

  const staffWorldIds = staffWorlds.map((w) => w.id);
  const [{ data: nodeRows }, { data: relRows }] = await Promise.all([
    supabase
      .from("nodes")
      .select("id, world_id, status, is_placeholder")
      .in("world_id", staffWorldIds),
    supabase.from("relationships").select("id, world_id").in("world_id", staffWorldIds),
  ]);

  // reports.target_id 是多型欄位,沒有真正的外鍵可以直接 embed 世界觀,
  // 所以先建節點/關係線 id -> world_id 的對照表,再查未結案檢舉。
  const nodeWorldMap = new Map((nodeRows ?? []).map((n) => [n.id, n.world_id]));
  const relWorldMap = new Map((relRows ?? []).map((r) => [r.id, r.world_id]));
  const nodeIds = [...nodeWorldMap.keys()];
  const relIds = [...relWorldMap.keys()];

  const [{ data: nodeReports }, { data: relReports }] = await Promise.all([
    nodeIds.length > 0
      ? supabase
          .from("reports")
          .select("target_id")
          .eq("target_type", "node")
          .eq("status", "open")
          .in("target_id", nodeIds)
      : Promise.resolve({ data: [] as { target_id: string }[] }),
    relIds.length > 0
      ? supabase
          .from("reports")
          .select("target_id")
          .eq("target_type", "relationship")
          .eq("status", "open")
          .in("target_id", relIds)
      : Promise.resolve({ data: [] as { target_id: string }[] }),
  ]);

  const pendingCountByWorld = new Map<string, number>();
  const stubCountByWorld = new Map<string, number>();
  for (const n of nodeRows ?? []) {
    if (n.status !== "pending") continue;
    if (n.is_placeholder) {
      stubCountByWorld.set(n.world_id, (stubCountByWorld.get(n.world_id) ?? 0) + 1);
    } else {
      pendingCountByWorld.set(n.world_id, (pendingCountByWorld.get(n.world_id) ?? 0) + 1);
    }
  }
  const openReportCountByWorld = new Map<string, number>();
  for (const r of nodeReports ?? []) {
    const worldId = nodeWorldMap.get(r.target_id);
    if (worldId) {
      openReportCountByWorld.set(worldId, (openReportCountByWorld.get(worldId) ?? 0) + 1);
    }
  }
  for (const r of relReports ?? []) {
    const worldId = relWorldMap.get(r.target_id);
    if (worldId) {
      openReportCountByWorld.set(worldId, (openReportCountByWorld.get(worldId) ?? 0) + 1);
    }
  }

  const worlds: ReviewWorldSummary[] = [];
  let pendingNodesTotal = 0;
  let stubNodesTotal = 0;
  let openReportsTotal = 0;
  for (const w of staffWorlds) {
    const pendingNodesCount = pendingCountByWorld.get(w.id) ?? 0;
    const stubNodesCount = stubCountByWorld.get(w.id) ?? 0;
    const openReportsCount = openReportCountByWorld.get(w.id) ?? 0;
    pendingNodesTotal += pendingNodesCount;
    stubNodesTotal += stubNodesCount;
    openReportsTotal += openReportsCount;
    if (pendingNodesCount > 0 || stubNodesCount > 0 || openReportsCount > 0) {
      worlds.push({
        worldSlug: w.slug,
        worldName: w.name,
        pendingNodesCount,
        stubNodesCount,
        openReportsCount,
      });
    }
  }

  return { worlds, pendingNodesTotal, stubNodesTotal, openReportsTotal };
}
