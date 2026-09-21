"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";
import { moveOrderedItem } from "@/lib/orderedList";
import {
  WORLD_MAP_BUCKET,
  WORLD_MAP_MAX_BYTES,
  WORLD_MAP_ALLOWED_TYPES,
} from "@/lib/worldmap";

export type WorldMapFormState = { error: string } | undefined;

async function requireWorldAdmin(worldId: string) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_world_admin", {
    p_world_id: worldId,
  });
  return { supabase, isAdmin: Boolean(isAdmin) };
}

const NameSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入圖層名稱" })
  .max(30, { error: "圖層名稱最多 30 字" });

export type MapLayerFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

/**
 * 新增一張世界地圖圖層(例如不同樓層、大陸圖/城市圖)。跟以前
 * worlds.map_image_path 只有 admin 能上傳/移除同一個等級,圖層本身算是
 * 世界觀層級的設定——誰能把節點標到圖層上(staff)是另一件事,見
 * setNodeMapPosition。
 */
export async function createMapLayer(
  _prevState: MapLayerFormState,
  formData: FormData,
): Promise<MapLayerFormState> {
  await requireUser();
  const worldId = formData.get("worldId");
  const worldSlug = formData.get("worldSlug");
  if (typeof worldId !== "string" || typeof worldSlug !== "string") {
    return { error: "缺少必要欄位" };
  }
  const parsed = NameSchema.safeParse(formData.get("name") ?? "");
  if (!parsed.success) {
    return { fieldErrors: { name: [parsed.error.issues[0].message] } };
  }

  const { supabase, isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    return { error: "只有這個世界觀的主辦(admin)可以新增圖層" };
  }

  const { data: last } = await supabase
    .from("world_map_layers")
    .select("order_index")
    .eq("world_id", worldId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("world_map_layers").insert({
    world_id: worldId,
    name: parsed.data,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return { error: error.code === "23505" ? "已經有一個同名的圖層了" : "新增失敗,請稍後再試" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap/layers`);
  return undefined;
}

export async function renameMapLayer(
  _prevState: MapLayerFormState,
  formData: FormData,
): Promise<MapLayerFormState> {
  await requireUser();
  const layerId = formData.get("layerId");
  const worldId = formData.get("worldId");
  const worldSlug = formData.get("worldSlug");
  if (
    typeof layerId !== "string" ||
    typeof worldId !== "string" ||
    typeof worldSlug !== "string"
  ) {
    return { error: "缺少必要欄位" };
  }
  const parsed = NameSchema.safeParse(formData.get("name") ?? "");
  if (!parsed.success) {
    return { fieldErrors: { name: [parsed.error.issues[0].message] } };
  }

  const { supabase, isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    return { error: "只有這個世界觀的主辦(admin)可以改圖層名稱" };
  }

  const { error } = await supabase
    .from("world_map_layers")
    .update({ name: parsed.data })
    .eq("id", layerId);
  if (error) {
    return { error: error.code === "23505" ? "已經有一個同名的圖層了" : "更新失敗,請稍後再試" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap/layers`);
  return undefined;
}

/** 刪除圖層——標在這張圖層上的節點座標會被 trg_clear_map_positions_on_layer_delete 自動清空。 */
export async function deleteMapLayer(
  layerId: string,
  worldId: string,
  worldSlug: string,
): Promise<void> {
  const { supabase, isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    throw new Error("只有這個世界觀的主辦(admin)可以刪除圖層");
  }

  const { data: layer } = await supabase
    .from("world_map_layers")
    .select("image_path")
    .eq("id", layerId)
    .maybeSingle();

  const { error } = await supabase
    .from("world_map_layers")
    .delete()
    .eq("id", layerId);
  if (error) {
    throw new Error("刪除失敗,請稍後再試");
  }

  if (layer?.image_path) {
    const admin = createAdminClient();
    await admin.storage.from(WORLD_MAP_BUCKET).remove([layer.image_path]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap/layers`);
}

/** 圖層排序:跟同世界觀裡上/下一張圖層交換 order_index。 */
export async function moveMapLayer(
  layerId: string,
  worldId: string,
  worldSlug: string,
  direction: "up" | "down",
): Promise<void> {
  const { supabase, isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    throw new Error("只有這個世界觀的主辦(admin)可以調整圖層順序");
  }

  const { error } = await moveOrderedItem({
    supabase,
    table: "world_map_layers",
    itemId: layerId,
    group: { column: "world_id", value: worldId },
    direction,
  });
  if (error) throw new Error(error);

  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap/layers`);
}

export type UploadTicketResult =
  | { error: string }
  | { path: string; token: string };

/**
 * 跟以前世界地圖底圖上傳同一套兩段式流程(見原本的說明):先跟我們的
 * Server Action 要一張簽名上傳票券,瀏覽器再直接把檔案傳到 Supabase
 * Storage,完全不經過我們自己的 server,避免大圖片撞到 Vercel serverless
 * function 的 request body 大小限制。
 */
export async function createMapLayerUploadTicket(
  layerId: string,
  worldId: string,
  contentType: string,
  fileSize: number,
): Promise<UploadTicketResult> {
  await requireUser();

  if (fileSize <= 0) {
    return { error: "請選擇一張圖片" };
  }
  if (fileSize > WORLD_MAP_MAX_BYTES) {
    return { error: "圖片不能超過 8MB" };
  }
  const ext = WORLD_MAP_ALLOWED_TYPES[contentType];
  if (!ext) {
    return { error: "只接受 PNG / JPEG / WebP 圖片" };
  }

  const { isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    return { error: "只有這個世界觀的主辦(admin)可以上傳圖層底圖" };
  }

  const admin = createAdminClient();
  const path = `${worldId}/${layerId}-${Date.now()}.${ext}`;
  const { data, error } = await admin.storage
    .from(WORLD_MAP_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return { error: "無法建立上傳票券,請稍後再試" };
  }

  return { path: data.path, token: data.token };
}

/** 瀏覽器直接把檔案傳到 Supabase Storage 成功後,呼叫這裡把路徑寫回圖層資料。 */
export async function finalizeMapLayerUpload(
  layerId: string,
  worldId: string,
  worldSlug: string,
  path: string,
): Promise<WorldMapFormState> {
  const { supabase, isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    return { error: "只有這個世界觀的主辦(admin)可以上傳圖層底圖" };
  }

  const { data: layer } = await supabase
    .from("world_map_layers")
    .select("image_path")
    .eq("id", layerId)
    .maybeSingle();

  const { error: updateError, count } = await supabase
    .from("world_map_layers")
    .update({ image_path: path }, { count: "exact" })
    .eq("id", layerId);
  if (updateError || count === 0) {
    const admin = createAdminClient();
    await admin.storage.from(WORLD_MAP_BUCKET).remove([path]);
    return { error: "更新圖層資料失敗,請稍後再試" };
  }

  if (layer?.image_path) {
    const admin = createAdminClient();
    await admin.storage.from(WORLD_MAP_BUCKET).remove([layer.image_path]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap/layers`);
  return undefined;
}

/** 移除圖層底圖(圖層本身跟已經標的座標都保留 —— 之後重新上傳底圖,舊座標會繼續套用)。 */
export async function removeMapLayerImage(
  layerId: string,
  worldId: string,
  worldSlug: string,
): Promise<void> {
  const { supabase, isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    throw new Error("只有這個世界觀的主辦(admin)可以移除圖層底圖");
  }

  const { data: layer } = await supabase
    .from("world_map_layers")
    .select("image_path")
    .eq("id", layerId)
    .maybeSingle();

  const { error, count } = await supabase
    .from("world_map_layers")
    .update({ image_path: null }, { count: "exact" })
    .eq("id", layerId);
  if (error || count === 0) {
    throw new Error("移除失敗,請稍後再試");
  }

  if (layer?.image_path) {
    const admin = createAdminClient();
    await admin.storage.from(WORLD_MAP_BUCKET).remove([layer.image_path]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap/layers`);
}

const SetPositionSchema = z.object({
  nodeId: z.uuid(),
  worldSlug: z.string().min(1),
  layerId: z.uuid(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export type SetPositionResult = { error: string } | { ok: true };

/**
 * 設定/調整節點在世界地圖某張圖層上的位置。x/y 是該圖層底圖寬高的比例
 * (0~1)。「只有 staff/site_admin 能改」不是靠這裡的程式碼把關,是
 * guard_node_map_position trigger 在資料庫層鎖死的 —— 就算是節點的
 * creator 本人或 collaborative 成員,一樣會被擋下來;圖層是否真的屬於
 * 這個節點所在的世界觀,也是同一個 trigger 檢查的。
 */
export async function setNodeMapPosition(input: {
  nodeId: string;
  worldSlug: string;
  layerId: string;
  x: number;
  y: number;
}): Promise<SetPositionResult> {
  await requireUser();
  const parsed = SetPositionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "座標不合法" };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("nodes")
    .update(
      {
        map_layer_id: parsed.data.layerId,
        map_x: parsed.data.x,
        map_y: parsed.data.y,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.nodeId);

  if (error || count === 0) {
    return { error: "你沒有權限調整這個節點在地圖上的位置" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/worldmap`);
  return { ok: true };
}

/** 把節點從地圖上移除(座標與圖層都設回 NULL),節點本身不受影響。 */
export async function clearNodeMapPosition(
  nodeId: string,
  worldSlug: string,
): Promise<SetPositionResult> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("nodes")
    .update(
      { map_x: null, map_y: null, map_layer_id: null },
      { count: "exact" },
    )
    .eq("id", nodeId);

  if (error || count === 0) {
    return { error: "你沒有權限調整這個節點在地圖上的位置" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
  return { ok: true };
}
