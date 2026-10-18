import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * 節點找不到時,查一次這個 slug 是不是某個節點的舊代稱(見 migration 046
 * 的 node_slug_redirects)——拼音轉換邏輯上線前,純中文標題的節點 slug
 * 完全看不出對應哪個標題,站務用 /dashboard/admin/slug-migration 補發
 * 新代稱後,舊網址都會記錄在這張表,呼叫端應該在呼叫 notFound() 之前
 * 用這個函式查一次,查得到就 301 轉址到新網址,不要讓舊連結直接壞掉。
 */
export async function findRedirectedNodeSlug(
  supabase: SupabaseServerClient,
  worldId: string,
  oldSlug: string,
): Promise<string | null> {
  const { data: redirect } = await supabase
    .from("node_slug_redirects")
    .select("node_id")
    .eq("world_id", worldId)
    .eq("old_slug", oldSlug)
    .maybeSingle();
  if (!redirect) return null;

  const { data: node } = await supabase
    .from("nodes")
    .select("slug")
    .eq("id", redirect.node_id)
    .maybeSingle();
  return node?.slug ?? null;
}
