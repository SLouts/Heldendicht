"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

/**
 * 標記單一通知已讀。RLS 的 notifications_update_own 已經把關「只能改自己
 * 收到的通知」,這裡不用再額外檢查 recipient_id。
 */
export async function markNotificationRead(id: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  revalidatePath("/dashboard", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);
  revalidatePath("/dashboard", "layout");
}

export async function deleteNotification(id: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", id);
  revalidatePath("/dashboard", "layout");
}
