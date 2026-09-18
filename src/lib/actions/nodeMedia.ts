"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";
import {
  NODE_MEDIA_BUCKET,
  NODE_AVATAR_MAX_BYTES,
  NODE_ILLUSTRATION_MAX_BYTES,
  NODE_IMAGE_MAX_BYTES,
  NODE_MEDIA_ALLOWED_TYPES,
} from "@/lib/nodeMedia";

export type NodeMediaFormState = { error: string } | undefined;
export type UploadTicketResult =
  | { error: string }
  | { path: string; token: string };

export type NodeMediaKind = "avatar" | "illustration" | "image";

const KIND_LABEL: Record<NodeMediaKind, string> = {
  avatar: "頭貼",
  illustration: "立繪",
  image: "代表圖",
};

const KIND_MAX_BYTES: Record<NodeMediaKind, number> = {
  avatar: NODE_AVATAR_MAX_BYTES,
  illustration: NODE_ILLUSTRATION_MAX_BYTES,
  image: NODE_IMAGE_MAX_BYTES,
};

/**
 * avatar/illustration 只有角色節點能用,跟 nodes.image_path 那種「任何
 * 節點都能掛一張代表圖」的用途不同——這裡另外查一次 node_type 擋掉
 * 把頭貼/立繪掛到非角色節點上的情況(UI 本來就不會顯示這兩個選項給
 * 非角色節點,這裡是 API 層再擋一次)。
 */
async function requireNodeEditAccess(nodeId: string, kind: NodeMediaKind) {
  const supabase = await createClient();
  const [{ data: canEdit }, { data: node }] = await Promise.all([
    supabase.rpc("can_edit_node", { p_node_id: nodeId }),
    supabase.from("nodes").select("node_type").eq("id", nodeId).maybeSingle(),
  ]);
  if (!canEdit) {
    return { supabase, ok: false as const, error: "沒有編輯這個節點的權限" };
  }
  if (kind !== "image" && node?.node_type !== "character") {
    return { supabase, ok: false as const, error: "只有角色節點可以設定頭貼/立繪" };
  }
  return { supabase, ok: true as const };
}

/**
 * 節點代表圖/角色頭貼/立繪上傳,跟世界觀橫幅/Icon 同一套兩段式簽名上傳
 * 流程(見 lib/actions/worldMedia.ts 的說明):先跟這裡要簽名上傳票券,
 * 瀏覽器直接把檔案傳到 Supabase Storage,不經過我們自己的 server。
 */
export async function createNodeMediaUploadTicket(
  kind: NodeMediaKind,
  nodeId: string,
  contentType: string,
  fileSize: number,
): Promise<UploadTicketResult> {
  await requireUser();

  if (fileSize <= 0) {
    return { error: "請選擇一張圖片" };
  }
  const maxBytes = KIND_MAX_BYTES[kind];
  if (fileSize > maxBytes) {
    return { error: `圖片不能超過 ${Math.round(maxBytes / (1024 * 1024))}MB` };
  }
  const ext = NODE_MEDIA_ALLOWED_TYPES[contentType];
  if (!ext) {
    return { error: "只接受 PNG / JPEG / WebP 圖片" };
  }

  const { ok, error } = await requireNodeEditAccess(nodeId, kind);
  if (!ok) return { error: error ?? `只有能編輯這個節點的人可以上傳${KIND_LABEL[kind]}` };

  const admin = createAdminClient();
  const path = `${nodeId}/${kind}-${Date.now()}.${ext}`;
  const { data, error: signError } = await admin.storage
    .from(NODE_MEDIA_BUCKET)
    .createSignedUploadUrl(path);
  if (signError || !data) {
    return { error: "無法建立上傳票券,請稍後再試" };
  }

  return { path: data.path, token: data.token };
}

/** 瀏覽器直接把檔案傳到 Supabase Storage 成功後,呼叫這裡把路徑寫回節點資料。 */
export async function finalizeNodeMediaUpload(
  kind: NodeMediaKind,
  nodeId: string,
  worldSlug: string,
  nodeSlug: string,
  path: string,
): Promise<NodeMediaFormState> {
  const { supabase, ok, error } = await requireNodeEditAccess(nodeId, kind);
  if (!ok) return { error: error ?? `只有能編輯這個節點的人可以上傳${KIND_LABEL[kind]}` };

  const oldPath =
    kind === "image"
      ? (await supabase.from("nodes").select("image_path").eq("id", nodeId).maybeSingle()).data
          ?.image_path
      : kind === "avatar"
        ? (
            await supabase
              .from("characters")
              .select("avatar_path")
              .eq("node_id", nodeId)
              .maybeSingle()
          ).data?.avatar_path
        : (
            await supabase
              .from("characters")
              .select("illustration_path")
              .eq("node_id", nodeId)
              .maybeSingle()
          ).data?.illustration_path;

  const { error: updateError, count } =
    kind === "image"
      ? await supabase
          .from("nodes")
          .update({ image_path: path }, { count: "exact" })
          .eq("id", nodeId)
      : kind === "avatar"
        ? await supabase
            .from("characters")
            .update({ avatar_path: path }, { count: "exact" })
            .eq("node_id", nodeId)
        : await supabase
            .from("characters")
            .update({ illustration_path: path }, { count: "exact" })
            .eq("node_id", nodeId);
  if (updateError || count === 0) {
    const admin = createAdminClient();
    await admin.storage.from(NODE_MEDIA_BUCKET).remove([path]);
    return { error: "更新失敗,請稍後再試" };
  }

  if (oldPath) {
    const admin = createAdminClient();
    await admin.storage.from(NODE_MEDIA_BUCKET).remove([oldPath]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  revalidatePath(`/worlds/${worldSlug}/nodes/${nodeSlug}`);
  return undefined;
}

/** 移除節點代表圖/角色頭貼/立繪。 */
export async function removeNodeMedia(
  kind: NodeMediaKind,
  nodeId: string,
  worldSlug: string,
  nodeSlug: string,
): Promise<void> {
  const { supabase, ok, error } = await requireNodeEditAccess(nodeId, kind);
  if (!ok) throw new Error(error ?? `只有能編輯這個節點的人可以移除${KIND_LABEL[kind]}`);

  const oldPath =
    kind === "image"
      ? (await supabase.from("nodes").select("image_path").eq("id", nodeId).maybeSingle()).data
          ?.image_path
      : kind === "avatar"
        ? (
            await supabase
              .from("characters")
              .select("avatar_path")
              .eq("node_id", nodeId)
              .maybeSingle()
          ).data?.avatar_path
        : (
            await supabase
              .from("characters")
              .select("illustration_path")
              .eq("node_id", nodeId)
              .maybeSingle()
          ).data?.illustration_path;

  const { error: updateError, count } =
    kind === "image"
      ? await supabase.from("nodes").update({ image_path: null }, { count: "exact" }).eq("id", nodeId)
      : kind === "avatar"
        ? await supabase
            .from("characters")
            .update({ avatar_path: null }, { count: "exact" })
            .eq("node_id", nodeId)
        : await supabase
            .from("characters")
            .update({ illustration_path: null }, { count: "exact" })
            .eq("node_id", nodeId);
  if (updateError || count === 0) {
    throw new Error("移除失敗,請稍後再試");
  }

  if (oldPath) {
    const admin = createAdminClient();
    await admin.storage.from(NODE_MEDIA_BUCKET).remove([oldPath]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  revalidatePath(`/worlds/${worldSlug}/nodes/${nodeSlug}`);
}
