import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * 給 Client Component 用。session 自動讀寫在 cookie 裡,
 * 讓 Server Component / Server Action 也能看到同一份登入狀態。
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
