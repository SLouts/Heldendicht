"use server";

import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";

export type AdminResetPasswordState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | { success: true; identifier: string; newPassword: string }
  | undefined;

const AdminResetPasswordSchema = z.object({
  identifier: z.string().trim().min(1, { error: "請輸入 Email 或使用者名稱" }),
  newPassword: z.string().min(8, { error: "新密碼至少需要 8 個字元" }),
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
  await requireUser();

  const parsed = AdminResetPasswordSchema.safeParse({
    identifier: formData.get("identifier"),
    newPassword: formData.get("newPassword"),
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
  });
  if (error) {
    return { error: "修改失敗,請稍後再試" };
  }

  return {
    success: true,
    identifier: parsed.data.identifier,
    newPassword: parsed.data.newPassword,
  };
}
