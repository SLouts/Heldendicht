import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * 全站目前有 9 種「同一組底下可以排序的清單」(世界觀規則/全站規則/
 * 角色必填欄位/補充區塊範本/節點補充區塊/角色時間線/世界地圖圖層/
 * 內容分類/分類預設欄位),「上移/下移」都是同一套演算法——依 order_index 排序取出
 * 同一組(同 world_id/node_id)的清單,找出目前這筆的位置,跟相鄰一筆
 * 互換 order_index。抽成共用函式,不要每加一種可排序清單就重寫一次。
 *
 * table 限定成這幾張已知有 id/order_index 欄位的表,不開放任意字串——
 * 這樣打錯表名會在編譯期就被抓到,而不是等到執行期才發現查不到資料。
 */
type OrderedTableName =
  | "world_rule_fields"
  | "site_rule_fields"
  | "world_character_fields"
  | "world_category_fields"
  | "world_section_templates"
  | "node_sections"
  | "character_timeline_events"
  | "world_map_layers"
  | "world_content_categories";

export async function moveOrderedItem({
  supabase,
  table,
  itemId,
  group,
  direction,
}: {
  supabase: SupabaseClient<Database>;
  table: OrderedTableName;
  itemId: string;
  /** 同一組的分組欄位,例如 { column: "world_id", value: worldId }——
   * site_rule_fields 這種沒有分組、全站只有一份清單的表可以省略。 */
  group?: { column: string; value: string };
  direction: "up" | "down";
}): Promise<{ error: string | null }> {
  let query = supabase.from(table).select("id, order_index");
  if (group) {
    query = query.eq(group.column, group.value);
  }
  const { data: items } = await query.order("order_index", { ascending: true });
  if (!items) return { error: null };

  const idx = items.findIndex((item) => item.id === itemId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= items.length) return { error: null };

  const current = items[idx];
  const sibling = items[swapIdx];

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from(table).update({ order_index: sibling.order_index }).eq("id", current.id),
    supabase.from(table).update({ order_index: current.order_index }).eq("id", sibling.id),
  ]);

  return { error: e1 || e2 ? "排序失敗,請稍後再試" : null };
}
