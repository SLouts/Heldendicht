"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { fromTaipeiDatetimeLocalValue } from "@/lib/taipeiTime";

export type EventFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

/**
 * 報名資格條件用兩組同長度的陣列(ruleFieldId[]/ruleValue[])送,不是
 * JSON——跟表單欄位直接對應,依索引配對成 {fieldId, requiredValue} 組,
 * 空值(使用者沒選欄位或沒填值的那一列)直接濾掉,不當成錯誤。
 */
function zipEligibilityRules(fieldIds: string[], values: string[]) {
  return fieldIds
    .map((fieldId, i) => ({ fieldId, requiredValue: (values[i] ?? "").trim() }))
    .filter((r) => r.fieldId.trim() !== "" && r.requiredValue !== "");
}

const EventFieldsSchema = {
  title: z.string().min(1, { error: "請輸入公告標題" }),
  description: z.string(),
  quota: z.coerce.number().int({ error: "名額請輸入整數" }).min(1, { error: "名額至少要 1" }),
  signupOpensAt: z.string().min(1, { error: "請填報名開放時間" }),
  signupClosesAt: z.string().min(1, { error: "請填報名截止時間" }),
  submissionDeadline: z.string(),
  allowMultipleEntriesPerAccount: z.coerce.boolean(),
  ruleFieldIds: z.array(z.string()),
  ruleValues: z.array(z.string()),
};

const CreateEventSchema = z.object({
  worldId: z.uuid(),
  worldSlug: z.string().min(1),
  ...EventFieldsSchema,
});

/**
 * 發布報名公告——只有世界觀 staff/site_admin 能成功(world_events_write
 * policy 擋非 staff),這裡不重複判斷權限,交給資料庫。報名資格條件
 * (world_event_eligibility_rules)在公告建立成功後另外插入,失敗的話
 * 公告本身已經建立,請主辦回到編輯頁補救,不整個回滾(維持跟
 * updateChapterParticipants 等既有「整批寫入失敗就提示重試」一致的
 * 簡單錯誤處理,不做跨表交易)。
 */
export async function createEvent(
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const user = await requireUser();

  const parsed = CreateEventSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    quota: formData.get("quota"),
    signupOpensAt: formData.get("signupOpensAt"),
    signupClosesAt: formData.get("signupClosesAt"),
    submissionDeadline: formData.get("submissionDeadline") ?? "",
    allowMultipleEntriesPerAccount: formData.get("allowMultipleEntriesPerAccount") === "on",
    ruleFieldIds: formData.getAll("ruleFieldId"),
    ruleValues: formData.getAll("ruleValue"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const opensAtIso = fromTaipeiDatetimeLocalValue(parsed.data.signupOpensAt);
  const closesAtIso = fromTaipeiDatetimeLocalValue(parsed.data.signupClosesAt);
  if (closesAtIso <= opensAtIso) {
    return { error: "報名截止時間要晚於開放時間" };
  }
  const deadlineIso =
    parsed.data.submissionDeadline.trim() === ""
      ? null
      : fromTaipeiDatetimeLocalValue(parsed.data.submissionDeadline);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("world_events")
    .insert({
      world_id: parsed.data.worldId,
      creator_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description || "",
      quota: parsed.data.quota,
      signup_opens_at: opensAtIso,
      signup_closes_at: closesAtIso,
      submission_deadline: deadlineIso,
      allow_multiple_entries_per_account: parsed.data.allowMultipleEntriesPerAccount,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "建立失敗,你可能沒有權限建立公告" };
  }

  const rules = zipEligibilityRules(parsed.data.ruleFieldIds, parsed.data.ruleValues);
  if (rules.length > 0) {
    const { error: rulesError } = await supabase.from("world_event_eligibility_rules").insert(
      rules.map((r) => ({
        event_id: data.id,
        field_id: r.fieldId,
        required_value: r.requiredValue,
      })),
    );
    if (rulesError) {
      return { error: "公告已建立,但報名資格條件儲存失敗,請到公告頁重新編輯" };
    }
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/events`);
  redirect(`/dashboard/worlds/${parsed.data.worldSlug}/events/${data.id}`);
}

const UpdateEventSchema = z.object({
  eventId: z.uuid(),
  worldSlug: z.string().min(1),
  ...EventFieldsSchema,
});

/**
 * 編輯公告——報名資格條件整批替換(先刪掉原本全部,再依送出的清單重新
 * 插入),跟 updateChapterParticipants 同慣例。只有 staff/site_admin
 * 能成功。
 */
export async function updateEvent(
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireUser();

  const parsed = UpdateEventSchema.safeParse({
    eventId: formData.get("eventId"),
    worldSlug: formData.get("worldSlug"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    quota: formData.get("quota"),
    signupOpensAt: formData.get("signupOpensAt"),
    signupClosesAt: formData.get("signupClosesAt"),
    submissionDeadline: formData.get("submissionDeadline") ?? "",
    allowMultipleEntriesPerAccount: formData.get("allowMultipleEntriesPerAccount") === "on",
    ruleFieldIds: formData.getAll("ruleFieldId"),
    ruleValues: formData.getAll("ruleValue"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const opensAtIso = fromTaipeiDatetimeLocalValue(parsed.data.signupOpensAt);
  const closesAtIso = fromTaipeiDatetimeLocalValue(parsed.data.signupClosesAt);
  if (closesAtIso <= opensAtIso) {
    return { error: "報名截止時間要晚於開放時間" };
  }
  const deadlineIso =
    parsed.data.submissionDeadline.trim() === ""
      ? null
      : fromTaipeiDatetimeLocalValue(parsed.data.submissionDeadline);

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("world_events")
    .update(
      {
        title: parsed.data.title,
        description: parsed.data.description || "",
        quota: parsed.data.quota,
        signup_opens_at: opensAtIso,
        signup_closes_at: closesAtIso,
        submission_deadline: deadlineIso,
        allow_multiple_entries_per_account: parsed.data.allowMultipleEntriesPerAccount,
        updated_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.eventId);

  if (error) {
    return { error: "更新失敗,請稍後再試" };
  }
  if (count === 0) {
    return { error: "你沒有權限編輯這個公告" };
  }

  const { error: deleteError } = await supabase
    .from("world_event_eligibility_rules")
    .delete()
    .eq("event_id", parsed.data.eventId);
  if (deleteError) {
    return { error: "更新報名資格條件失敗,請稍後再試" };
  }

  const rules = zipEligibilityRules(parsed.data.ruleFieldIds, parsed.data.ruleValues);
  if (rules.length > 0) {
    const { error: insertError } = await supabase.from("world_event_eligibility_rules").insert(
      rules.map((r) => ({
        event_id: parsed.data.eventId,
        field_id: r.fieldId,
        required_value: r.requiredValue,
      })),
    );
    if (insertError) {
      return { error: "更新報名資格條件失敗,請稍後再試" };
    }
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/events/${parsed.data.eventId}`);
  return undefined;
}

export async function deleteEvent(eventId: string, worldSlug: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("world_events")
    .delete({ count: "exact" })
    .eq("id", eventId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限刪除這個公告");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/events`);
  redirect(`/dashboard/worlds/${worldSlug}/events`);
}

const SignUpSchema = z.object({
  eventId: z.uuid(),
  worldSlug: z.string().min(1),
  characterNodeId: z.uuid({ error: "請選擇要報名的角色" }),
});

/**
 * 報名——資格/時間窗/每帳號限制這些檢查都在 guard_event_entry_insert()
 * 這個 trigger 裡,不是這裡,失敗時直接把 Postgres 丟出來的中文錯誤訊息
 * 顯示給玩家看(例如「這個角色不符合報名資格」)。
 */
export async function signUpForEvent(
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const user = await requireUser();

  const parsed = SignUpSchema.safeParse({
    eventId: formData.get("eventId"),
    worldSlug: formData.get("worldSlug"),
    characterNodeId: formData.get("characterNodeId"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("world_event_entries").insert({
    event_id: parsed.data.eventId,
    character_node_id: parsed.data.characterNodeId,
    account_id: user.id,
  });

  if (error) {
    return { error: error.message || "報名失敗,請稍後再試" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/events/${parsed.data.eventId}`);
  return undefined;
}

export async function withdrawEventEntry(
  entryId: string,
  eventId: string,
  worldSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("world_event_entries")
    .delete({ count: "exact" })
    .eq("id", entryId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "沒辦法撤回這筆報名");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/events/${eventId}`);
}

/**
 * 抽籤——呼叫 draw_event_winners() RPC,非 SECURITY DEFINER,實際寫入
 * 靠 world_event_entries_update/world_events_write 這兩條既有 RLS
 * 把關(只有 staff/site_admin 能成功),這裡不重複判斷權限。
 */
export async function drawEventWinners(eventId: string, worldSlug: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("draw_event_winners", { p_event_id: eventId });
  if (error) {
    throw new Error(error.message || "抽籤失敗,請稍後再試");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/events/${eventId}`);
}

const SubmitContentSchema = z.object({
  entryId: z.uuid(),
  eventId: z.uuid(),
  worldSlug: z.string().min(1),
  content: z.string(),
});

/**
 * 中籤者自己繳交內容——只有抽中(status='drawn')之後才能寫,
 * guard_event_entry_update() 這個 trigger 把關,不是這裡判斷。
 */
export async function submitEventEntryContent(
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireUser();

  const parsed = SubmitContentSchema.safeParse({
    entryId: formData.get("entryId"),
    eventId: formData.get("eventId"),
    worldSlug: formData.get("worldSlug"),
    content: formData.get("content") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("world_event_entries")
    .update({ submission_content: parsed.data.content }, { count: "exact" })
    .eq("id", parsed.data.entryId);

  if (error) {
    return { error: error.message || "繳件失敗,請稍後再試" };
  }
  if (count === 0) {
    return { error: "你沒有權限繳交這筆內容" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/events/${parsed.data.eventId}`);
  return undefined;
}
