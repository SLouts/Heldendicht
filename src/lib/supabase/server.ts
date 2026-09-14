import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * 給 Server Component / Server Action / Route Handler 用。
 * 每次 render 都要重新建立(不要跨 request 共用),
 * 這樣才能讀到當次 request 的 cookie。
 *
 * 這個 client 用的是 anon key,實際能做什麼完全由 RLS policy 決定,
 * 所以「權限檢查交給資料庫」而不是在這裡手動判斷角色。
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // 在 Server Component 裡呼叫 setAll 會丟例外(Server Component 不能寫 cookie),
            // 可以安全忽略 —— 只要 proxy.ts 有正常刷新 session 就沒問題。
          }
        },
      },
    },
  );
}
