import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * 處理 Supabase Auth 寄出的信件連結(目前只用在忘記密碼流程)。
 * Supabase 的信件範本要改成連到這裡,帶 token_hash/type/next 三個參數
 * ——見 lib/actions/auth.ts 的 requestPasswordReset 說明。
 *
 * verifyOtp 通過後,這次 request 的 session cookie 就會被換成「已驗證」
 * 的 session,直接轉去 next 指定的頁面(忘記密碼流程是 /reset-password)。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // next 只接受同站的相對路徑,避免被拿來做 open redirect
  // (例如 next=https://phishing.example)。
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/forgot-password?error=expired", origin),
  );
}
