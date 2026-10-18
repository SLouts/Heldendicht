"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { generateNodeSlug } from "@/lib/slug";

const MAX_SLUG_ATTEMPTS = 5;
const CJK_PATTERN = /[一-鿿]/;

export type SlugMigrationResult = {
  renamed: { nodeId: string; title: string; oldSlug: string; newSlug: string }[];
  skipped: number;
  errors: string[];
};

/**
 * 一次性工具——補發拼音修好之前建立、標題帶中文字的節點 slug(見
 * lib/slug.ts 的說明)。只處理「還沒補過」的節點(node_slug_redirects
 * 裡還沒有這個 node_id 的紀錄),所以重複執行是安全的,不會對同一個
 * 節點重複改名、累積一串沒意義的舊 slug 紀錄。
 *
 * rename_node_slug() 不是 SECURITY DEFINER,實際權限邊界是 nodes_update
 * 跟 node_slug_redirects_insert 這兩條 RLS policy(都已經包含
 * is_site_admin()),這裡的 is_site_admin() 檢查只是先擋一次,給使用者
 * 看得懂的錯誤訊息,不是真正的安全邊界。
 */
export async function regenerateChineseNodeSlugs(): Promise<SlugMigrationResult> {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");
  if (!isSiteAdmin) {
    return { renamed: [], skipped: 0, errors: ["只有站務管理員可以使用這個功能"] };
  }

  const [{ data: alreadyMigrated }, { data: allNodes }] = await Promise.all([
    supabase.from("node_slug_redirects").select("node_id"),
    supabase.from("nodes").select("id, world_id, slug, title"),
  ]);

  const migratedIds = new Set((alreadyMigrated ?? []).map((r) => r.node_id));
  const slugsByWorld = new Map<string, Set<string>>();
  for (const n of allNodes ?? []) {
    const set = slugsByWorld.get(n.world_id) ?? new Set<string>();
    set.add(n.slug);
    slugsByWorld.set(n.world_id, set);
  }

  const candidates = (allNodes ?? []).filter(
    (n) => !migratedIds.has(n.id) && CJK_PATTERN.test(n.title),
  );

  const result: SlugMigrationResult = { renamed: [], skipped: 0, errors: [] };

  for (const node of candidates) {
    const worldSlugs = slugsByWorld.get(node.world_id)!;
    let newSlug: string | null = null;
    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
      const candidate = generateNodeSlug(node.title);
      if (!worldSlugs.has(candidate)) {
        newSlug = candidate;
        break;
      }
    }
    if (!newSlug) {
      result.errors.push(`${node.title}(${node.id}):嘗試多次都撞號,跳過`);
      continue;
    }

    const { error } = await supabase.rpc("rename_node_slug", {
      p_node_id: node.id,
      p_new_slug: newSlug,
    });
    if (error) {
      result.errors.push(`${node.title}(${node.id}):${error.message}`);
      continue;
    }

    worldSlugs.add(newSlug);
    result.renamed.push({
      nodeId: node.id,
      title: node.title,
      oldSlug: node.slug,
      newSlug,
    });
  }

  result.skipped = (allNodes ?? []).length - candidates.length;
  return result;
}
