"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type ReportFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | { success: true }
  | undefined;

const CreateReportSchema = z.object({
  targetType: z.enum(["node", "relationship"]),
  targetId: z.uuid(),
  reason: z.string().min(1, { error: "請填寫檢舉原因" }),
  redirectPath: z.string().min(1),
});

/**
 * 建立檢舉。任何登入的使用者都能檢舉自己看得到的節點/關係線
 * (reports_insert policy 只要求 reporter_id = auth.uid(),不用是世界觀成員),
 * 不需要額外判斷 —— 送出後維持在同一頁,只顯示「已送出」。
 */
export async function createReport(
  _prevState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const user = await requireUser();

  const parsed = CreateReportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    reason: formData.get("reason"),
    redirectPath: formData.get("redirectPath"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reporter_id: user.id,
    reason: parsed.data.reason,
  });

  if (error) {
    return { error: "送出失敗,請稍後再試" };
  }

  revalidatePath(parsed.data.redirectPath);
  return { success: true };
}

/**
 * 處理檢舉(標記已處理 / 駁回)。只有該世界觀 staff 或 site_admin 能成功
 * ——由 reports_update_staff policy 把關,這裡只讀受影響筆數判斷。
 * 沒有開放刪除檢舉紀錄(reports 表沒有 delete policy),處理完只會改狀態。
 */
export async function resolveReport(
  reportId: string,
  worldSlug: string,
  status: "resolved" | "dismissed",
): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("reports")
    .update(
      { status, resolved_by: user.id, resolved_at: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", reportId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限處理這個檢舉");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/reports`);
}
