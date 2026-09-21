"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";
import { moveOrderedItem } from "@/lib/orderedList";
import {
  NODE_MEDIA_BUCKET,
  NODE_TIMELINE_IMAGE_MAX_BYTES,
  NODE_MEDIA_ALLOWED_TYPES,
} from "@/lib/nodeMedia";

export type TimelineEventFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;
export type UploadTicketResult =
  | { error: string }
  | { path: string; token: string };

const TimelineEventSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, { error: "請輸入標籤,例如「十三歲」" })
    .max(30, { error: "標籤最多 30 字" }),
  description: z
    .string()
    .trim()
    .min(1, { error: "請輸入這個時間點發生的事" })
    .max(500, { error: "描述最多 500 字" }),
  content: z.string().trim().max(3000, { error: "內文最多 3000 字" }),
  isSpoiler: z.boolean(),
});

/**
 * 角色節點的生平時間線。只有角色節點能新增(跟 characters.avatar_path/
 * illustration_path 同一套限制,在這裡查 node_type,不在 DB 層擋)。
 * 「能不能編輯」交給 character_timeline_events 的 RLS policy
 * (can_edit_node),這裡不重複檢查。
 */
export async function createTimelineEvent(
  _prevState: TimelineEventFormState,
  formData: FormData,
): Promise<TimelineEventFormState> {
  await requireUser();

  const nodeId = formData.get("nodeId");
  const worldSlug = formData.get("worldSlug");
  const nodeSlug = formData.get("nodeSlug");
  if (
    typeof nodeId !== "string" ||
    typeof worldSlug !== "string" ||
    typeof nodeSlug !== "string"
  ) {
    return { error: "缺少必要欄位" };
  }

  const parsed = TimelineEventSchema.safeParse({
    label: formData.get("label") ?? "",
    description: formData.get("description") ?? "",
    content: formData.get("content") ?? "",
    isSpoiler: formData.get("isSpoiler") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { data: node } = await supabase
    .from("nodes")
    .select("node_type")
    .eq("id", nodeId)
    .maybeSingle();
  if (node?.node_type !== "character") {
    return { error: "只有角色節點可以新增時間軸" };
  }

  const { data: last } = await supabase
    .from("character_timeline_events")
    .select("order_index")
    .eq("node_id", nodeId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("character_timeline_events").insert({
    node_id: nodeId,
    label: parsed.data.label,
    description: parsed.data.description,
    content: parsed.data.content,
    is_spoiler: parsed.data.isSpoiler,
    order_index: (last?.order_index ?? -1) + 1,
  });
  if (error) {
    return { error: "新增失敗,請確認你有這個節點的編輯權限" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  revalidatePath(`/worlds/${worldSlug}/nodes/${nodeSlug}`);
  return undefined;
}

export async function updateTimelineEvent(
  _prevState: TimelineEventFormState,
  formData: FormData,
): Promise<TimelineEventFormState> {
  await requireUser();

  const eventId = formData.get("eventId");
  const worldSlug = formData.get("worldSlug");
  const nodeSlug = formData.get("nodeSlug");
  if (
    typeof eventId !== "string" ||
    typeof worldSlug !== "string" ||
    typeof nodeSlug !== "string"
  ) {
    return { error: "缺少必要欄位" };
  }

  const parsed = TimelineEventSchema.safeParse({
    label: formData.get("label") ?? "",
    description: formData.get("description") ?? "",
    content: formData.get("content") ?? "",
    isSpoiler: formData.get("isSpoiler") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("character_timeline_events")
    .update(
      {
        label: parsed.data.label,
        description: parsed.data.description,
        content: parsed.data.content,
        is_spoiler: parsed.data.isSpoiler,
        updated_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", eventId);
  if (error || count === 0) {
    return { error: "更新失敗,請確認你有這個節點的編輯權限" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  revalidatePath(`/worlds/${worldSlug}/nodes/${nodeSlug}`);
  return undefined;
}

export async function deleteTimelineEvent(
  eventId: string,
  worldSlug: string,
  nodeSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("character_timeline_events")
    .delete({ count: "exact" })
    .eq("id", eventId);
  if (error || count === 0) {
    throw new Error("刪除失敗,或你沒有權限");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  revalidatePath(`/worlds/${worldSlug}/nodes/${nodeSlug}`);
}

/** 上移/下移一個時間點:跟相鄰的時間點互換 order_index。 */
export async function moveTimelineEvent(
  eventId: string,
  nodeId: string,
  worldSlug: string,
  nodeSlug: string,
  direction: "up" | "down",
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await moveOrderedItem({
    supabase,
    table: "character_timeline_events",
    itemId: eventId,
    group: { column: "node_id", value: nodeId },
    direction,
  });
  if (error) throw new Error(error);

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  revalidatePath(`/worlds/${worldSlug}/nodes/${nodeSlug}`);
}

/**
 * 時間點的配圖——跟頭貼/立繪同一個 node-media bucket(private + signed
 * URL),路徑用 `${node_id}/timeline-${event_id}-...` 區分,不會跟其他
 * 時間點或頭貼/立繪互相覆蓋。權限用時間點自己的 node_id 查
 * can_edit_node,不额外查 node_type(能新增時間點就代表已經是角色節點)。
 */
async function requireTimelineEventEditAccess(eventId: string) {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("character_timeline_events")
    .select("node_id, image_path")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) {
    return { supabase, ok: false as const, error: "找不到這個時間點" };
  }
  const { data: canEdit } = await supabase.rpc("can_edit_node", {
    p_node_id: event.node_id,
  });
  if (!canEdit) {
    return { supabase, ok: false as const, error: "沒有編輯這個節點的權限" };
  }
  return {
    supabase,
    ok: true as const,
    nodeId: event.node_id,
    oldImagePath: event.image_path,
  };
}

export async function createTimelineEventImageUploadTicket(
  eventId: string,
  contentType: string,
  fileSize: number,
): Promise<UploadTicketResult> {
  await requireUser();

  if (fileSize <= 0) {
    return { error: "請選擇一張圖片" };
  }
  if (fileSize > NODE_TIMELINE_IMAGE_MAX_BYTES) {
    return { error: `圖片不能超過 ${Math.round(NODE_TIMELINE_IMAGE_MAX_BYTES / (1024 * 1024))}MB` };
  }
  const ext = NODE_MEDIA_ALLOWED_TYPES[contentType];
  if (!ext) {
    return { error: "只接受 PNG / JPEG / WebP 圖片" };
  }

  const { ok, error, nodeId } = await requireTimelineEventEditAccess(eventId);
  if (!ok || !nodeId) return { error: error ?? "沒有編輯權限" };

  const admin = createAdminClient();
  const path = `${nodeId}/timeline-${eventId}-${Date.now()}.${ext}`;
  const { data, error: signError } = await admin.storage
    .from(NODE_MEDIA_BUCKET)
    .createSignedUploadUrl(path);
  if (signError || !data) {
    return { error: "無法建立上傳票券,請稍後再試" };
  }

  return { path: data.path, token: data.token };
}

export async function finalizeTimelineEventImage(
  eventId: string,
  worldSlug: string,
  nodeSlug: string,
  path: string,
): Promise<TimelineEventFormState> {
  const { supabase, ok, error, oldImagePath } =
    await requireTimelineEventEditAccess(eventId);
  if (!ok) return { error: error ?? "沒有編輯權限" };

  const { error: updateError, count } = await supabase
    .from("character_timeline_events")
    .update({ image_path: path }, { count: "exact" })
    .eq("id", eventId);
  if (updateError || count === 0) {
    const admin = createAdminClient();
    await admin.storage.from(NODE_MEDIA_BUCKET).remove([path]);
    return { error: "更新失敗,請稍後再試" };
  }

  if (oldImagePath) {
    const admin = createAdminClient();
    await admin.storage.from(NODE_MEDIA_BUCKET).remove([oldImagePath]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  revalidatePath(`/worlds/${worldSlug}/nodes/${nodeSlug}`);
  return undefined;
}

export async function removeTimelineEventImage(
  eventId: string,
  worldSlug: string,
  nodeSlug: string,
): Promise<void> {
  const { supabase, ok, error, oldImagePath } =
    await requireTimelineEventEditAccess(eventId);
  if (!ok) throw new Error(error ?? "沒有編輯權限");

  const { error: updateError, count } = await supabase
    .from("character_timeline_events")
    .update({ image_path: null }, { count: "exact" })
    .eq("id", eventId);
  if (updateError || count === 0) {
    throw new Error("移除失敗,請稍後再試");
  }

  if (oldImagePath) {
    const admin = createAdminClient();
    await admin.storage.from(NODE_MEDIA_BUCKET).remove([oldImagePath]);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  revalidatePath(`/worlds/${worldSlug}/nodes/${nodeSlug}`);
}
