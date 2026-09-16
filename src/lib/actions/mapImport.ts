"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { parseUsomapGeoJson } from "@/lib/geoImport";

export type MapImportFormState =
  | { error: string }
  | { ok: true; imported: number }
  | undefined;

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * 從 USOMAP(架空地圖產生器)匯出的 .geojson 批次建立地點節點,並直接標好
 * 地圖座標。只有世界觀 staff(admin/editor)能匯入 —— 靠 is_world_staff
 * 檢查,不是 nodes_insert_member 這條 RLS policy(它只要求「是成員」)。
 * 匯入的節點跟手動新增的節點一樣從 pending 開始,要再經過審核。
 */
export async function importUsomapGeoJson(
  _prevState: MapImportFormState,
  formData: FormData,
): Promise<MapImportFormState> {
  const user = await requireUser();

  const worldId = formData.get("worldId");
  const worldSlug = formData.get("worldSlug");
  const layerId = formData.get("layerId");
  const file = formData.get("file");

  if (
    typeof worldId !== "string" ||
    typeof worldSlug !== "string" ||
    typeof layerId !== "string" ||
    !(file instanceof File)
  ) {
    return { error: "缺少必要欄位" };
  }
  if (file.size === 0) {
    return { error: "請選擇一個 .geojson 檔案" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "檔案不能超過 5MB" };
  }

  const supabase = await createClient();
  const { data: isStaff } = await supabase.rpc("is_world_staff", {
    p_world_id: worldId,
  });
  if (!isStaff) {
    return { error: "只有這個世界觀的主辦/編輯可以匯入地圖資料" };
  }

  const raw = await file.text();
  let parsedNodes;
  try {
    parsedNodes = parseUsomapGeoJson(raw);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "檔案格式不正確" };
  }
  if (parsedNodes.length === 0) {
    return { error: "這份檔案裡沒有可以匯入的地點(city / nation / label)" };
  }

  const batchId = Date.now().toString(36);
  const rows = parsedNodes.map((n, i) => ({
    world_id: worldId,
    node_type: "location" as const,
    title: n.name,
    slug: `usomap-${batchId}-${i}`,
    content: "",
    edit_mode: "collaborative" as const,
    creator_id: user.id,
    map_layer_id: layerId,
    map_x: n.x,
    map_y: n.y,
  }));

  const { error, count } = await supabase
    .from("nodes")
    .insert(rows, { count: "exact" });

  if (error) {
    return { error: `匯入失敗:${error.message}` };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  return { ok: true, imported: count ?? rows.length };
}
