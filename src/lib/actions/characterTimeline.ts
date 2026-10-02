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

/**
 * 月/日都是選填的補充精確度(見 migration 035)——空字串代表沒填,轉成
 * null;有填就驗證是不是落在合法範圍內的整數。不驗證月份實際天數上限,
 * 這是世界觀自己的曆法,不是地球西元曆。
 */
function optionalDatePart(min: number, max: number, label: string) {
  return z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), {
      error: `${label}請輸入 ${min}~${max} 的整數`,
    });
}

const TimelineEventSchema = z
  .object({
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
    // 選填——填了之後這個時間點會一起顯示在世界觀整體(企劃)的橫向時間軸
    // 上,跟官方章節並排,不填就只留在這個角色自己的時間軸裡(維持原狀)。
    worldYear: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : Number(v)))
      .refine((v) => v === null || Number.isInteger(v), { error: "世界觀年份請輸入整數" }),
    worldYearMonth: optionalDatePart(1, 12, "月份"),
    worldYearDay: optionalDatePart(1, 31, "日期"),
  })
  .refine((data) => data.worldYearMonth === null || data.worldYear !== null, {
    error: "請先填世界觀年份",
    path: ["worldYearMonth"],
  })
  .refine((data) => data.worldYearDay === null || data.worldYearMonth !== null, {
    error: "請先填月份",
    path: ["worldYearDay"],
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
    worldYear: formData.get("worldYear") ?? "",
    worldYearMonth: formData.get("worldYearMonth") ?? "",
    worldYearDay: formData.get("worldYearDay") ?? "",
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

  const basePayload = {
    node_id: nodeId,
    label: parsed.data.label,
    description: parsed.data.description,
    content: parsed.data.content,
    is_spoiler: parsed.data.isSpoiler,
    order_index: (last?.order_index ?? -1) + 1,
  };

  // migration 034/035 套用前 character_timeline_events 還沒有
  // world_year/world_year_month/world_year_day 這些欄位,帶著 insert
  // 會直接失敗——依序接住失敗,退回更少欄位的 insert,讓新增時間點在
  // 套用 migration 之前還能正常運作,只是沒辦法填世界觀年份/月/日。
  const withFullDate = await supabase.from("character_timeline_events").insert({
    ...basePayload,
    world_year: parsed.data.worldYear,
    world_year_month: parsed.data.worldYearMonth,
    world_year_day: parsed.data.worldYearDay,
  });

  const withYearOnly = withFullDate.error
    ? await supabase
        .from("character_timeline_events")
        .insert({ ...basePayload, world_year: parsed.data.worldYear })
    : withFullDate;

  const error = withYearOnly.error
    ? (await supabase.from("character_timeline_events").insert(basePayload)).error
    : null;
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
    worldYear: formData.get("worldYear") ?? "",
    worldYearMonth: formData.get("worldYearMonth") ?? "",
    worldYearDay: formData.get("worldYearDay") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const basePayload = {
    label: parsed.data.label,
    description: parsed.data.description,
    content: parsed.data.content,
    is_spoiler: parsed.data.isSpoiler,
    updated_at: new Date().toISOString(),
  };

  // migration 034/035 套用前還沒有 world_year/world_year_month/
  // world_year_day 這些欄位,帶著 update 會直接失敗——依序接住失敗,
  // 退回更少欄位的 update。
  const withFullDate = await supabase
    .from("character_timeline_events")
    .update(
      {
        ...basePayload,
        world_year: parsed.data.worldYear,
        world_year_month: parsed.data.worldYearMonth,
        world_year_day: parsed.data.worldYearDay,
      },
      { count: "exact" },
    )
    .eq("id", eventId);

  const withYearOnly = withFullDate.error
    ? await supabase
        .from("character_timeline_events")
        .update({ ...basePayload, world_year: parsed.data.worldYear }, { count: "exact" })
        .eq("id", eventId)
    : withFullDate;

  const { error, count } = withYearOnly.error
    ? await supabase
        .from("character_timeline_events")
        .update(basePayload, { count: "exact" })
        .eq("id", eventId)
    : withYearOnly;
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
