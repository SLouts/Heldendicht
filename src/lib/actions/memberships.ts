"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type MembershipFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

export type InviteCandidate = {
  id: string;
  username: string | null;
  displayName: string | null;
};

/**
 * 用使用者名稱搜尋還不是這個世界觀成員的使用者,給「加成員」表單的
 * 自動完成清單用。改用 username 而不是 email 搜尋,是因為 username
 * 本來就是公開資訊(到處都看得到、拿來組網址),不像 email 那樣用「查
 * 得到/查不到」就能拿來試探一個信箱是否已經註冊過帳號。
 */
export async function searchInviteCandidates(
  worldId: string,
  query: string,
): Promise<InviteCandidate[]> {
  await requireUser();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const supabase = await createClient();

  const { data: existingMembers } = await supabase
    .from("world_memberships")
    .select("user_id")
    .eq("world_id", worldId);
  const existingIds = (existingMembers ?? []).map((m) => m.user_id);

  let candidateQuery = supabase
    .from("profiles")
    .select("id, username, display_name")
    .ilike("username", `%${trimmed}%`)
    .limit(8);
  if (existingIds.length > 0) {
    candidateQuery = candidateQuery.not("id", "in", `(${existingIds.join(",")})`);
  }
  const { data } = await candidateQuery;

  return (data ?? []).map((p) => ({ id: p.id, username: p.username, displayName: p.display_name }));
}

const AddMemberSchema = z.object({
  worldId: z.uuid(),
  worldSlug: z.string().min(1),
  userId: z.uuid(),
  role: z.enum(["member", "editor", "admin"]),
});

/**
 * 把一個已經有帳號的使用者加進這個世界觀——呼叫端(InviteMemberForm)
 * 已經先用 searchInviteCandidates 讓站務/主辦從清單裡選,這裡只負責
 * 寫入。實際能不能寫入 world_memberships 完全交給 memberships_insert_admin
 * 這條 RLS policy(僅世界觀 admin 或 site_admin)。
 */
export async function addMember(
  _prevState: MembershipFormState,
  formData: FormData,
): Promise<MembershipFormState> {
  await requireUser();

  const parsed = AddMemberSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: "請先從搜尋結果選一個使用者" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("world_memberships").insert({
    world_id: parsed.data.worldId,
    user_id: parsed.data.userId,
    role: parsed.data.role,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "這個人已經是這個世界觀的成員了"
          : "你沒有權限新增成員,或新增失敗",
    };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/members`);
  return undefined;
}

/**
 * 這個世界觀目前有幾位「主辦」(role='admin')——降級/移除/轉移主辦都要
 * 先確認「這是不是最後一位」,避免世界觀變成沒有任何人能管理。
 */
async function countWorldAdmins(
  supabase: Awaited<ReturnType<typeof createClient>>,
  worldId: string,
): Promise<number> {
  const { count } = await supabase
    .from("world_memberships")
    .select("*", { count: "exact", head: true })
    .eq("world_id", worldId)
    .eq("role", "admin");
  return count ?? 0;
}

const LAST_ADMIN_MESSAGE =
  "這是世界觀最後一位主辦,不能降級或移除——請先把其他成員設為主辦,或使用「轉移主辦」。";

/** 變更成員角色(member/editor/admin)。權限交給 memberships_update_admin policy。 */
export async function updateMemberRole(
  membershipId: string,
  worldSlug: string,
  role: "member" | "editor" | "admin",
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("world_memberships")
    .select("world_id, role")
    .eq("id", membershipId)
    .maybeSingle();
  if (!membership) {
    throw new Error("找不到這個成員資格");
  }

  if (membership.role === "admin" && role !== "admin") {
    const adminCount = await countWorldAdmins(supabase, membership.world_id);
    if (adminCount <= 1) {
      throw new Error(LAST_ADMIN_MESSAGE);
    }
  }

  const { error, count } = await supabase
    .from("world_memberships")
    .update({ role }, { count: "exact" })
    .eq("id", membershipId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限調整這個成員的角色");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/members`);
}

/** 移除成員。權限交給 memberships_delete_self_or_admin policy(本人退出,或世界觀 admin 踢人)。 */
export async function removeMember(
  membershipId: string,
  worldSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("world_memberships")
    .select("world_id, role")
    .eq("id", membershipId)
    .maybeSingle();
  if (!membership) {
    throw new Error("找不到這個成員資格");
  }

  if (membership.role === "admin") {
    const adminCount = await countWorldAdmins(supabase, membership.world_id);
    if (adminCount <= 1) {
      throw new Error(LAST_ADMIN_MESSAGE);
    }
  }

  const { error, count } = await supabase
    .from("world_memberships")
    .delete({ count: "exact" })
    .eq("id", membershipId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限移除這個成員");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/members`);
}

/**
 * 轉移主辦——把目標成員升為主辦,同時把自己降為編輯。順序刻意是「先升
 * 對方、再降自己」:如果反過來,當你是目前唯一的主辦時,降級會先被
 * 上面「最後一位主辦不能降級」的防呆擋下,陷入兩邊都動不了的死結。
 */
export async function transferOwnership(
  targetMembershipId: string,
  worldSlug: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: target } = await supabase
    .from("world_memberships")
    .select("id, world_id, user_id")
    .eq("id", targetMembershipId)
    .maybeSingle();
  if (!target) {
    throw new Error("找不到這個成員");
  }

  const { data: selfMembership } = await supabase
    .from("world_memberships")
    .select("id")
    .eq("world_id", target.world_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!selfMembership) {
    throw new Error("你不是這個世界觀的成員");
  }
  if (selfMembership.id === target.id) {
    throw new Error("不能把主辦轉移給自己");
  }

  const { error: promoteError, count: promoteCount } = await supabase
    .from("world_memberships")
    .update({ role: "admin" }, { count: "exact" })
    .eq("id", target.id);
  if (promoteError || promoteCount === 0) {
    throw new Error(promoteError?.message ?? "無法將對方設為主辦");
  }

  const { error: demoteError } = await supabase
    .from("world_memberships")
    .update({ role: "editor" })
    .eq("id", selfMembership.id);
  if (demoteError) {
    throw new Error(demoteError.message);
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/members`);
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
}
