"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type FollowResult = { error: string } | { ok: true };

/**
 * 單向追蹤,不需要對方同意。「誰能追蹤誰」交給 follows_insert_self RLS
 * 把關(follower_id 一定要是自己),這裡的 user.id === followeeId 檢查
 * 只是提早給一句好懂的錯誤訊息,不是真正的安全邊界。
 */
export async function followUser(
  followeeId: string,
  profileUsername?: string,
): Promise<FollowResult> {
  const user = await requireUser();
  if (user.id === followeeId) {
    return { error: "不能追蹤自己" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, followee_id: followeeId });
  if (error) {
    return { error: error.code === "23505" ? "已經追蹤過了" : "追蹤失敗,請稍後再試" };
  }

  if (profileUsername) revalidatePath(`/u/${profileUsername}`);
  return { ok: true };
}

export async function unfollowUser(
  followeeId: string,
  profileUsername?: string,
): Promise<FollowResult> {
  const user = await requireUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", followeeId);
  if (error) {
    return { error: "取消追蹤失敗,請稍後再試" };
  }

  if (profileUsername) revalidatePath(`/u/${profileUsername}`);
  return { ok: true };
}
