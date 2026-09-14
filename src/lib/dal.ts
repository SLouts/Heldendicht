import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer —— 所有需要「目前登入者是誰」的地方都應該呼叫這裡,
 * 而不是各自在 page/action 裡重複判斷。
 *
 * 用 `getClaims()` 而不是 `getSession()`:`getSession()` 只讀 cookie、
 * 不會驗證 token 是否有效,不能拿來做權限判斷;`getClaims()` 會驗證
 * JWT(有非對稱簽章金鑰時甚至不用打 API,純本地驗證),等同官方建議的
 * `getUser()`,但省了一次網路來回。
 *
 * 用 React `cache()` 包起來,同一次 render pass 內重複呼叫只會驗證一次。
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) {
    return null;
  }

  return {
    id: data.claims.sub,
    email: data.claims.email as string | undefined,
  };
});

/**
 * 頁面/layout 需要「必須登入」時呼叫這個,未登入就導去 /login。
 * 實際的資料存取權限一律交給 RLS policy 把關,這裡只是使用者體驗上的攔截,
 * 不是安全邊界本身 —— 每個 Server Action / Route Handler 仍應各自驗證。
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
});
