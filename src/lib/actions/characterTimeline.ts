"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type TimelineEventFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

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

  const { data: events } = await supabase
    .from("character_timeline_events")
    .select("id, order_index")
    .eq("node_id", nodeId)
    .order("order_index", { ascending: true });
  if (!events) return;

  const idx = events.findIndex((e) => e.id === eventId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= events.length) return;

  const current = events[idx];
  const sibling = events[swapIdx];

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase
      .from("character_timeline_events")
      .update({ order_index: sibling.order_index })
      .eq("id", current.id),
    supabase
      .from("character_timeline_events")
      .update({ order_index: current.order_index })
      .eq("id", sibling.id),
  ]);
  if (e1 || e2) {
    throw new Error("排序失敗,請稍後再試");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  revalidatePath(`/worlds/${worldSlug}/nodes/${nodeSlug}`);
}
