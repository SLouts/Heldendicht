"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, getCurrentUser } from "@/lib/dal";

/**
 * 從 request header 組出目前這個部署的網址,拿來組「重設密碼信」裡的
 * 連結——沒有另外存一個 SITE_URL 環境變數,直接讀當次 request 的
 * host,本地開發、Vercel preview、正式站都不用另外設定。
 */
async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export type AuthFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | { success: true }
  | undefined;

const LoginSchema = z.object({
  email: z.email({ error: "請輸入有效的 Email" }),
  password: z.string().min(1, { error: "請輸入密碼" }),
});

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "帳號或密碼錯誤" };
  }

  redirect("/dashboard");
}

const SignupSchema = z.object({
  email: z.email({ error: "請輸入有效的 Email" }),
  password: z.string().min(8, { error: "密碼至少需要 8 個字元" }),
  inviteCode: z.string().min(1, { error: "請輸入邀請碼" }),
});

/**
 * 邀請碼註冊流程(對應 RLS_POLICIES.md 的假設 4):
 *
 * 1. 先用 admin client「檢查」邀請碼是否還有效(不消耗使用次數),
 *    無效就整個擋下來,不建立帳號。
 * 2. 用 admin client 直接建立已驗證信箱的帳號(不走 Supabase 內建的
 *    公開註冊 API,才能保證「沒過關就不能建帳號」)。
 * 3. 用一般 client 幫這個新帳號建立 session(等同登入)。
 * 4. 在已登入的狀態下呼叫 redeem_invite_code() RPC —— 這裡才是真正
 *    「消耗一次邀請碼」的地方,靠資料庫的 row lock 防止併發搶用。
 *    如果這步失敗(例如同時間被別人搶用完),就刪掉剛建立的帳號,
 *    不留下「沒有合法邀請碼卻能登入」的帳號。
 */
export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    inviteCode: formData.get("inviteCode"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { email, password, inviteCode } = parsed.data;

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invite_codes")
    .select("id, max_uses, use_count, expires_at")
    .eq("code", inviteCode)
    .maybeSingle();

  if (!invite) {
    return { error: "邀請碼不存在" };
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "邀請碼已過期" };
  }
  if (invite.use_count >= invite.max_uses) {
    return { error: "邀請碼已達使用上限" };
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !created.user) {
    return {
      error:
        createError?.code === "email_exists"
          ? "此 Email 已被註冊"
          : "註冊失敗,請稍後再試",
    };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "註冊失敗,請稍後再試" };
  }

  const { error: redeemError } = await supabase.rpc("redeem_invite_code", {
    p_code: inviteCode,
  });

  if (redeemError) {
    await supabase.auth.signOut();
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "邀請碼剛好被搶用完了,請換一組邀請碼再試一次" };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "請輸入目前的密碼" }),
    newPassword: z.string().min(8, { error: "新密碼至少需要 8 個字元" }),
    confirmPassword: z.string().min(1, { error: "請再輸入一次新密碼" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "兩次輸入的新密碼不一樣",
    path: ["confirmPassword"],
  });

/**
 * 修改密碼前先用 signInWithPassword 驗證使用者輸入的「目前密碼」是不是正確
 * ——Supabase 的 updateUser() 只要求現有 session 有效就能改密碼,不會自己
 * 要求再驗證一次舊密碼,如果不在這裡多做這一步,共用電腦上沒登出的 session
 * 就能被任何人直接改密碼、把原本的使用者鎖在外面。
 */
export async function changePassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await requireUser();

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (!user.email) {
    return { error: "此帳號沒有 Email,無法用這種方式修改密碼" };
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    return { fieldErrors: { currentPassword: ["目前的密碼不正確"] } };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateError) {
    return { error: "修改密碼失敗,請稍後再試" };
  }

  return { success: true };
}

const ForgotPasswordSchema = z.object({
  email: z.email({ error: "請輸入有效的 Email" }),
});

/**
 * 忘記密碼,寄重設密碼信。不管這個 Email 有沒有註冊過都回傳一樣的
 * 成功訊息,避免被拿來測試「哪些 Email 有在這個網站註冊過」。
 *
 * 信裡的連結會先連到 /auth/confirm(見該路由的說明),驗證成功後才
 * 帶著已登入的 session 轉去 /reset-password 讓使用者設定新密碼——這一步
 * 需要在 Supabase Dashboard 把「Reset Password」信件範本的連結換成
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password,
 * 不然預設範本寄出的連結不會跳到我們自己的網址。
 */
export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = ForgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const origin = await getSiteOrigin();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  return { success: true };
}

const CompletePasswordResetSchema = z
  .object({
    newPassword: z.string().min(8, { error: "新密碼至少需要 8 個字元" }),
    confirmPassword: z.string().min(1, { error: "請再輸入一次新密碼" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "兩次輸入的新密碼不一樣",
    path: ["confirmPassword"],
  });

/**
 * 忘記密碼流程的最後一步。這裡不用像 changePassword 那樣驗證「目前密碼」
 * ——使用者是靠點擊信箱裡的重設連結(/auth/confirm 那邊 verifyOtp 通過)
 * 才能有 session 走到這一步,等同已經證明過身分。
 */
export async function completePasswordReset(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "重設連結已失效,請重新申請一次" };
  }

  const parsed = CompletePasswordResetSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) {
    return { error: "修改密碼失敗,請稍後再試" };
  }

  redirect("/dashboard");
}
