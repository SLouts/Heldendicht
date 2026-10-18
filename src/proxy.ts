import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

// Next.js 16 把 middleware.ts 改名成 proxy.ts,行為完全一樣,只是換了檔名/函式名。
// 這裡的檢查只是「優化使用體驗」用的初步導向(optimistic check),
// 不是安全邊界本身 —— 真正的權限判斷永遠交給資料庫的 RLS policy。
const PROTECTED_PREFIXES = ["/dashboard"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // 觸發 lazy session 初始化 / refresh,並把新的 token 寫回 cookie。
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // app_metadata 只能透過管理 API 設定(使用者自己改不動),站務手動重設
  // 密碼時勾選「強制下次登入改密碼」就會設這個 claim——攔下除了
  // /dashboard/force-password-change 本身以外的所有 /dashboard/* 請求,
  // 逼對方先去改密碼。直接讀 JWT 裡已經驗證過的 claims,不用另外打 API。
  const forcePasswordChange = Boolean(
    (data?.claims as { app_metadata?: { force_password_change?: boolean } } | undefined)
      ?.app_metadata?.force_password_change,
  );
  if (
    isAuthenticated &&
    forcePasswordChange &&
    isProtected &&
    pathname !== "/dashboard/force-password-change"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/force-password-change";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
