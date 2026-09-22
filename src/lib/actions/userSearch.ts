"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type UserSearchResult = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  isFollowing: boolean;
};

const RESULT_LIMIT = 20;

/**
 * 搜尋使用者(用來找人追蹤/私訊)。只比對 username/display_name,故意不
 * 讓 email 可搜尋——雖然 profiles 整張表本來就對任何人公開讀取
 * (profiles_select_all),但開放「用 email 當搜尋關鍵字」等於變相做了一個
 * email 是否已註冊的探測工具,不是搜尋功能該有的副作用。完全在 Postgres
 * 內用 ILIKE 模糊比對,不呼叫任何第三方 AI / Embedding API。
 */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const user = await requireUser();
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const supabase = await createClient();

  // 跳脫 ILIKE 萬用字元,避免使用者輸入的 % _ \ 被當成 pattern 語法。
  const escaped = trimmedQuery.replace(/[%_\\]/g, (m) => `\\${m}`);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_path, bio")
    .neq("id", user.id)
    .or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
    .limit(RESULT_LIMIT);

  if (!profiles || profiles.length === 0) return [];

  const { data: followingRows } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", user.id)
    .in(
      "followee_id",
      profiles.map((p) => p.id),
    );
  const followingIds = new Set((followingRows ?? []).map((r) => r.followee_id));

  return profiles.map((p) => ({
    ...p,
    isFollowing: followingIds.has(p.id),
  }));
}
