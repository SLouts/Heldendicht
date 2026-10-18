import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 站務操作紀錄(migration 044 的 staff_actions_log)——寫入前不重複判斷
 * 「這個人是不是站務」,staff_actions_log_insert 這條 RLS policy
 * (is_site_admin() AND actor_id = auth.uid())本身就會把關,呼叫端
 * 已經走過 is_site_admin() 檢查的操作才應該呼叫這裡。
 *
 * 寫入失敗(理論上只會是呼叫端其實不是站務)不應該讓原本的操作跟著失敗
 * ——例如停權已經成功,紀錄寫不進去不該讓使用者以為停權失敗,這裡只是
 * 把錯誤吞掉,不拋出例外。
 */
export async function logStaffAction({
  actorId,
  targetType,
  targetId,
  action,
  detail,
}: {
  actorId: string;
  targetType: string;
  targetId?: string | null;
  action: string;
  detail?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("staff_actions_log").insert({
    actor_id: actorId,
    target_type: targetType,
    target_id: targetId ?? null,
    action,
    detail: detail ?? null,
  });
}
