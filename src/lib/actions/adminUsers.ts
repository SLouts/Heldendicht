"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";
import { logStaffAction } from "@/lib/staffLog";

export type AdminResetPasswordState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | { success: true; identifier: string; newPassword: string }
  | undefined;

const AdminResetPasswordSchema = z.object({
  identifier: z.string().trim().min(1, { error: "請輸入 Email 或使用者名稱" }),
  newPassword: z.string().min(8, { error: "新密碼至少需要 8 個字元" }),
  forcePasswordChange: z.boolean(),
});

/**
 * 站務手動幫使用者重設密碼——給「使用者一直收不到重設信」這種情況當備案。
 * updateUserById() 是直接呼叫 Supabase Auth 的管理 API,完全繞過資料庫
 * RLS,所以「只有 site_admin 能用」這件事沒有 RLS policy 可以把關,這裡
 * 的 is_site_admin() 檢查才是真正的權限邊界,不是像其他 action 那樣只是
 * UX 提示——拿掉這段檢查,任何登入的使用者都能亂改別人密碼。
 */
export async function adminResetUserPassword(
  _prevState: AdminResetPasswordState,
  formData: FormData,
): Promise<AdminResetPasswordState> {
  const actor = await requireUser();

  const parsed = AdminResetPasswordSchema.safeParse({
    identifier: formData.get("identifier"),
    newPassword: formData.get("newPassword"),
    forcePasswordChange: formData.get("forcePasswordChange") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");
  if (!isSiteAdmin) {
    return { error: "只有站務管理員可以使用這個功能" };
  }

  // 分兩次查詢(email 一次、username 一次),不要把使用者輸入直接組進
  // PostgREST 的 .or() 字串語法——那個語法本身有 `,`/`.` 等保留字元,
  // 使用者輸入裡如果剛好有這些字元,可能讓查詢條件被竄改。
  const { data: byEmail } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.identifier)
    .maybeSingle();
  const { data: byUsername } = byEmail
    ? { data: null }
    : await supabase
        .from("profiles")
        .select("id")
        .eq("username", parsed.data.identifier)
        .maybeSingle();
  const targetId = byEmail?.id ?? byUsername?.id;

  if (!targetId) {
    return { error: "找不到這個 Email 或使用者名稱對應的帳號" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(targetId, {
    password: parsed.data.newPassword,
    // app_metadata 只能透過管理 API 設定,使用者自己的 session 改不動,
    // 所以才能拿來當「強制下次登入要改密碼」的旗標——proxy.ts 會讀這個
    // claim,擋下任何想繞過改密碼頁面的請求。
    ...(parsed.data.forcePasswordChange
      ? { app_metadata: { force_password_change: true } }
      : {}),
  });
  if (error) {
    return { error: "修改失敗,請稍後再試" };
  }

  await logStaffAction({
    actorId: actor.id,
    targetType: "profile",
    targetId,
    action: "reset_password",
    detail: parsed.data.forcePasswordChange ? "已要求下次登入強制改密碼" : null,
  });

  return {
    success: true,
    identifier: parsed.data.identifier,
    newPassword: parsed.data.newPassword,
  };
}

/**
 * 停權/解除停權——真正擋住登入的是 Supabase Auth 的 ban_duration,
 * profiles.is_suspended 只是給列表頁快速顯示、篩選用的旗標,本身不會
 * 擋任何 RLS 查詢。is_site_admin() 檢查是真正的權限邊界(跟
 * adminResetUserPassword 同樣理由),不是 RLS——操作完都寫一筆
 * staff_actions_log。
 */
export async function suspendUser(
  userId: string,
  revalidatePathStr: string,
  formData: FormData,
): Promise<void> {
  const actor = await requireUser();
  if (userId === actor.id) {
    throw new Error("不能把自己停權");
  }
  const supabase = await createClient();
  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");
  if (!isSiteAdmin) {
    throw new Error("只有站務管理員可以使用這個功能");
  }

  const reason = String(formData.get("reason") ?? "").trim() || null;

  const { error, count } = await supabase
    .from("profiles")
    .update(
      {
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_by: actor.id,
        suspended_reason: reason,
      },
      { count: "exact" },
    )
    .eq("id", userId);
  if (error || count === 0) {
    throw new Error(error?.message ?? "停權失敗");
  }

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });

  await logStaffAction({
    actorId: actor.id,
    targetType: "profile",
    targetId: userId,
    action: "suspend_user",
    detail: reason,
  });

  revalidatePath(revalidatePathStr);
}

export async function unsuspendUser(userId: string, revalidatePathStr: string): Promise<void> {
  const actor = await requireUser();
  const supabase = await createClient();
  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");
  if (!isSiteAdmin) {
    throw new Error("只有站務管理員可以使用這個功能");
  }

  const { error, count } = await supabase
    .from("profiles")
    .update(
      {
        is_suspended: false,
        suspended_at: null,
        suspended_by: null,
        suspended_reason: null,
      },
      { count: "exact" },
    )
    .eq("id", userId);
  if (error || count === 0) {
    throw new Error(error?.message ?? "解除停權失敗");
  }

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });

  await logStaffAction({
    actorId: actor.id,
    targetType: "profile",
    targetId: userId,
    action: "unsuspend_user",
  });

  revalidatePath(revalidatePathStr);
}
