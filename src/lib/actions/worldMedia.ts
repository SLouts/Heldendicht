"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";
import {
  WORLD_MEDIA_BUCKET,
  WORLD_BANNER_MAX_BYTES,
  WORLD_ICON_MAX_BYTES,
  WORLD_MEDIA_ALLOWED_TYPES,
} from "@/lib/worldMedia";

export type WorldMediaFormState = { error: string } | undefined;
export type UploadTicketResult =
  | { error: string }
  | { path: string; token: string };

export type WorldMediaKind = "banner" | "icon";

const KIND_LABEL: Record<WorldMediaKind, string> = {
  banner: "橫幅",
  icon: "Icon",
};

async function requireWorldAdmin(worldId: string) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_world_admin", {
    p_world_id: worldId,
  });
  return { supabase, isAdmin: Boolean(isAdmin) };
}

/**
 * 世界觀橫幅/Icon 上傳,跟世界地圖底圖同一套兩段式簽名上傳流程(見
 * lib/actions/worldmap.ts 的說明):先跟這裡要簽名上傳票券,瀏覽器直接
 * 把檔案傳到 Supabase Storage,不經過我們自己的 server,避免撞到 Vercel
 * serverless function 的 request body 大小限制。
 */
export async function createWorldMediaUploadTicket(
  kind: WorldMediaKind,
  worldId: string,
  contentType: string,
  fileSize: number,
): Promise<UploadTicketResult> {
  await requireUser();

  if (fileSize <= 0) {
    return { error: "請選擇一張圖片" };
  }
  const maxBytes = kind === "banner" ? WORLD_BANNER_MAX_BYTES : WORLD_ICON_MAX_BYTES;
  if (fileSize > maxBytes) {
    return { error: `圖片不能超過 ${Math.round(maxBytes / (1024 * 1024))}MB` };
  }
  const ext = WORLD_MEDIA_ALLOWED_TYPES[contentType];
  if (!ext) {
    return { error: "只接受 PNG / JPEG / WebP 圖片" };
  }

  const { isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    return { error: `只有這個世界觀的主辦(admin)可以上傳${KIND_LABEL[kind]}` };
  }

  const admin = createAdminClient();
  const path = `${worldId}/${kind}-${Date.now()}.${ext}`;
  const { data, error } = await admin.storage
    .from(WORLD_MEDIA_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return { error: "無法建立上傳票券,請稍後再試" };
  }

  return { path: data.path, token: data.token };
}

/** 瀏覽器直接把檔案傳到 Supabase Storage 成功後,呼叫這裡把路徑寫回世界觀資料。 */
export async function finalizeWorldMediaUpload(
  kind: WorldMediaKind,
  worldId: string,
  worldSlug: string,
  path: string,
): Promise<WorldMediaFormState> {
  const { supabase, isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    return { error: `只有這個世界觀的主辦(admin)可以上傳${KIND_LABEL[kind]}` };
  }

  const { data: world } = await supabase
    .from("worlds")
    .select("banner_path, icon_path")
    .eq("id", worldId)
    .maybeSingle();

  const updatePayload = kind === "banner" ? { banner_path: path } : { icon_path: path };
  const { error: updateError, count } = await supabase
    .from("worlds")
    .update(updatePayload, { count: "exact" })
    .eq("id", worldId);
  if (updateError || count === 0) {
    const admin = createAdminClient();
    await admin.storage.from(WORLD_MEDIA_BUCKET).remove([path]);
    return { error: "更新失敗,請稍後再試" };
  }

  const oldPath = kind === "banner" ? world?.banner_path : world?.icon_path;
  if (oldPath) {
    const admin = createAdminClient();
    await admin.storage.from(WORLD_MEDIA_BUCKET).remove([oldPath]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/dashboard/worlds/${worldSlug}/settings`);
  revalidatePath(`/worlds/${worldSlug}`);
  return undefined;
}

/** 移除世界觀橫幅/Icon。 */
export async function removeWorldMedia(
  kind: WorldMediaKind,
  worldId: string,
  worldSlug: string,
): Promise<void> {
  const { supabase, isAdmin } = await requireWorldAdmin(worldId);
  if (!isAdmin) {
    throw new Error(`只有這個世界觀的主辦(admin)可以移除${KIND_LABEL[kind]}`);
  }

  const { data: world } = await supabase
    .from("worlds")
    .select("banner_path, icon_path")
    .eq("id", worldId)
    .maybeSingle();

  const updatePayload = kind === "banner" ? { banner_path: null } : { icon_path: null };
  const { error, count } = await supabase
    .from("worlds")
    .update(updatePayload, { count: "exact" })
    .eq("id", worldId);
  if (error || count === 0) {
    throw new Error("移除失敗,請稍後再試");
  }

  const oldPath = kind === "banner" ? world?.banner_path : world?.icon_path;
  if (oldPath) {
    const admin = createAdminClient();
    await admin.storage.from(WORLD_MEDIA_BUCKET).remove([oldPath]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/dashboard/worlds/${worldSlug}/settings`);
  revalidatePath(`/worlds/${worldSlug}`);
}
