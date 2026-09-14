"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type MembershipFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const InviteMemberSchema = z.object({
  worldId: z.uuid(),
  worldSlug: z.string().min(1),
  email: z.email({ error: "請輸入有效的 Email" }),
  role: z.enum(["member", "editor", "admin"]),
});

/**
 * 把一個已經有帳號(用邀請碼註冊過)的使用者加進這個世界觀。
 * 這裡只負責「用 email 查到對方的 user id」,實際能不能寫入
 * world_memberships 完全交給 memberships_insert_admin 這條 RLS policy
 * (僅世界觀 admin 或 site_admin)。
 *
 * profiles 表對所有人開放 SELECT(profiles_select_all),所以任何登入者
 * 都查得到 email 對應的 user id,這裡不算額外的資訊外洩。
 */
export async function inviteMemberByEmail(
  _prevState: MembershipFormState,
  formData: FormData,
): Promise<MembershipFormState> {
  await requireUser();

  const parsed = InviteMemberSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (!profile) {
    return { error: "找不到這個 Email 對應的帳號,請確認對方已經用邀請碼註冊過" };
  }

  const { error } = await supabase.from("world_memberships").insert({
    world_id: parsed.data.worldId,
    user_id: profile.id,
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

/** 變更成員角色(member/editor/admin)。權限交給 memberships_update_admin policy。 */
export async function updateMemberRole(
  membershipId: string,
  worldSlug: string,
  role: "member" | "editor" | "admin",
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

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

  const { error, count } = await supabase
    .from("world_memberships")
    .delete({ count: "exact" })
    .eq("id", membershipId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限移除這個成員");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/members`);
}
