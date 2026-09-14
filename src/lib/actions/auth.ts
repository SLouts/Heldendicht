"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
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
