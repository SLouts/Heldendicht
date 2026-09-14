import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * 用 service_role key 建立的 client,會繞過所有 RLS policy。
 *
 * 只能在伺服器端使用(`import "server-only"` 會在有人不小心從
 * Client Component import 這個檔案時,建置階段就報錯)。
 *
 * 目前兩個用途:
 * 1. 邀請碼註冊流程 —— 在 Server Action 裡先驗證邀請碼,驗證通過才用
 *    這個 client 呼叫 `auth.admin.createUser()` 建立帳號,讓「必須有
 *    邀請碼才能註冊」真正生效(否則使用者可以繞過驗證,直接打
 *    Supabase Auth 內建的公開註冊 API)。
 * 2. Storage 讀寫(`world-maps`、`node-attachments` 兩個 bucket)——
 *    這兩個 bucket 刻意不開放任何 anon/authenticated 的 storage RLS
 *    policy,上傳/刪除/簽發 signed URL 一律用這個 client,並且永遠要
 *    在呼叫前先用一般 RLS-gated client 檢查過使用者權限
 *    (`is_world_admin`、`can_edit_node` 等),詳見 `lib/worldmap.ts`
 *    與 `lib/attachments.ts`。
 *
 * 除此之外不要用這個 client 讀寫一般業務資料(nodes/relationships/…)——
 * 那些都應該用 `lib/supabase/server.ts` 的 anon-key client,讓 RLS
 * policy 負責把關。
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
