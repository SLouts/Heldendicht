"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";
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

/**
 * 上傳/更換世界地圖底圖。跟世界觀設定一樣限 admin(不是 staff)——
 * 底圖本身算是世界觀層級的設定,誰能標點(staff)是另一件事,見
 * setNodeMapPosition。
 */
export async function uploadWorldMap(
  _prevState: WorldMapFormState,
  formData: FormData,
): Promise<WorldMapFormState> {
  await requireUser();

  const worldId = formData.get("worldId");
  const worldSlug = formData.get("worldSlug");
  const file = formData.get("file");

  if (
    typeof worldId !== "string" ||
    typeof worldSlug !== "string" ||
    !(file instanceof File)
  ) {
    return { error: "缺少必要欄位" };
  }
  if (file.size === 0) {
    return { error: "請選擇一張圖片" };
  }
  if (file.size > WORLD_MAP_MAX_BYTES) {
    return { error: "圖片不能超過 8MB" };
  }
  const ext = WORLD_MAP_ALLOWED_TYPES[file.type];
  if (!ext) {
    return { error: "只接受 PNG / JPEG / WebP 圖片" };
  }

  const { supabase, isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    return { error: "只有這個世界觀的主辦(admin)可以上傳地圖" };
  }

  const { data: world } = await supabase
    .from("worlds")
    .select("map_image_path")
    .eq("id", worldId)
    .maybeSingle();

  const admin = createAdminClient();
  const path = `${worldId}/map-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(WORLD_MAP_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { error: "上傳失敗,請稍後再試" };
  }

  const { error: updateError, count } = await supabase
    .from("worlds")
    .update({ map_image_path: path }, { count: "exact" })
    .eq("id", worldId);
  if (updateError || count === 0) {
    await admin.storage.from(WORLD_MAP_BUCKET).remove([path]);
    return { error: "更新世界觀資料失敗,請稍後再試" };
  }

  if (world?.map_image_path) {
    await admin.storage.from(WORLD_MAP_BUCKET).remove([world.map_image_path]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/settings`);
  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
  return undefined;
}

/** 移除世界地圖底圖(連帶清掉所有節點已標的座標會保留 —— 之後重新上傳底圖,舊座標會繼續套用)。 */
export async function removeWorldMap(
  worldId: string,
  worldSlug: string,
): Promise<void> {
  const { supabase, isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    throw new Error("只有這個世界觀的主辦(admin)可以移除地圖");
  }

  const { data: world } = await supabase
    .from("worlds")
    .select("map_image_path")
    .eq("id", worldId)
    .maybeSingle();

  const { error, count } = await supabase
    .from("worlds")
    .update({ map_image_path: null }, { count: "exact" })
    .eq("id", worldId);
  if (error || count === 0) {
    throw new Error("移除失敗,請稍後再試");
  }

  if (world?.map_image_path) {
    const admin = createAdminClient();
    await admin.storage.from(WORLD_MAP_BUCKET).remove([world.map_image_path]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/settings`);
  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
}

const SetPositionSchema = z.object({
  nodeId: z.uuid(),
  worldSlug: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export type SetPositionResult = { error: string } | { ok: true };

/**
 * 設定/調整節點在世界地圖上的位置。x/y 是圖片寬高的比例(0~1)。
 * 「只有 staff/site_admin 能改」不是靠這裡的程式碼把關,是
 * guard_node_map_position trigger 在資料庫層鎖死的 —— 就算是節點的
 * creator 本人或 collaborative 成員,一樣會被擋下來。
 */
export async function setNodeMapPosition(input: {
  nodeId: string;
  worldSlug: string;
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
      { map_x: parsed.data.x, map_y: parsed.data.y },
      { count: "exact" },
    )
    .eq("id", parsed.data.nodeId);

  if (error || count === 0) {
    return { error: "你沒有權限調整這個節點在地圖上的位置" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/worldmap`);
  return { ok: true };
}

/** 把節點從地圖上移除(座標設回 NULL),節點本身不受影響。 */
export async function clearNodeMapPosition(
  nodeId: string,
  worldSlug: string,
): Promise<SetPositionResult> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("nodes")
    .update({ map_x: null, map_y: null }, { count: "exact" })
    .eq("id", nodeId);

  if (error || count === 0) {
    return { error: "你沒有權限調整這個節點在地圖上的位置" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/worldmap`);
  return { ok: true };
}
