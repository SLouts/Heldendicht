import type { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type OfficialChapterRow = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  year_start: number | null;
  year_end: number | null;
};

/**
 * 查「企劃時間軸」(scope='official')章節,照年份排序。
 *
 * migration 034 套用前 story_chapters 還沒有 year_start/year_end 這兩欄,
 * select 會直接失敗(欄位不存在)——這裡接住那個失敗,退回只查舊欄位,
 * 讓既有的章節清單在套用 migration 之前還能正常顯示,只是沒有年份/橫向
 * 版面,等套用後才會恢復。
 */
export async function fetchOfficialChapters(
  supabase: SupabaseServerClient,
  worldId: string,
): Promise<OfficialChapterRow[]> {
  const withYears = await supabase
    .from("story_chapters")
    .select("id, title, description, order_index, year_start, year_end")
    .eq("world_id", worldId)
    .eq("scope", "official")
    .order("year_start", { ascending: true, nullsFirst: false })
    .order("order_index", { ascending: true });

  if (!withYears.error) {
    return withYears.data ?? [];
  }

  const fallback = await supabase
    .from("story_chapters")
    .select("id, title, description, order_index")
    .eq("world_id", worldId)
    .eq("scope", "official")
    .order("order_index", { ascending: true });

  return (fallback.data ?? []).map((c) => ({
    ...c,
    year_start: null,
    year_end: null,
  }));
}

export type CharacterTimelineEventRow = {
  id: string;
  label: string;
  description: string;
  content: string;
  image_path: string | null;
  is_spoiler: boolean;
  world_year: number | null;
};

/**
 * 查單一角色節點自己的時間軸事件(含 world_year)——跟
 * fetchWorldCharacterTimelineEvents 不同,這裡是給角色節點自己的頁面用
 * (顯示 CharacterTimelineDisplay/Editor,不分有沒有填世界觀年份)。
 *
 * migration 034 套用前還沒有 world_year 這欄,select 會失敗,這裡接住
 * 失敗退回不含這欄的查詢,讓既有的角色時間軸在套用 migration 之前還能
 * 正常顯示。
 */
export async function fetchCharacterTimelineEvents(
  supabase: SupabaseServerClient,
  nodeId: string,
): Promise<CharacterTimelineEventRow[]> {
  const withYear = await supabase
    .from("character_timeline_events")
    .select("id, label, description, content, image_path, is_spoiler, world_year")
    .eq("node_id", nodeId)
    .order("order_index", { ascending: true });
  if (!withYear.error) return withYear.data ?? [];

  const fallback = await supabase
    .from("character_timeline_events")
    .select("id, label, description, content, image_path, is_spoiler")
    .eq("node_id", nodeId)
    .order("order_index", { ascending: true });
  return (fallback.data ?? []).map((e) => ({ ...e, world_year: null }));
}

export type WorldCharacterEventRow = {
  id: string;
  label: string;
  description: string;
  is_spoiler: boolean;
  world_year: number;
  character_title: string;
  character_slug: string;
};

/**
 * 查這個世界觀底下所有角色節點、已經填了「世界觀年份」的時間點——
 * 用來跟官方章節並排顯示在企劃時間軸上。
 *
 * migration 034 套用前 character_timeline_events 還沒有 world_year 這欄,
 * select 會失敗,這裡直接當作「沒有任何角色時間點要顯示」,不影響其餘
 * 既有功能(角色自己頁面上的時間軸完全不走這條查詢)。
 */
export async function fetchWorldCharacterTimelineEvents(
  supabase: SupabaseServerClient,
  worldId: string,
): Promise<WorldCharacterEventRow[]> {
  const result = await supabase
    .from("character_timeline_events")
    .select(
      "id, label, description, is_spoiler, world_year, node:nodes!inner(title, slug, world_id, node_type)",
    )
    .eq("node.world_id", worldId)
    .eq("node.node_type", "character")
    .not("world_year", "is", null)
    .order("world_year", { ascending: true });

  if (result.error || !result.data) return [];

  return result.data
    .map((e) => {
      const node = unwrapRelation(e.node);
      if (!node || e.world_year == null) return null;
      return {
        id: e.id,
        label: e.label,
        description: e.description,
        is_spoiler: e.is_spoiler,
        world_year: e.world_year,
        character_title: node.title,
        character_slug: node.slug,
      };
    })
    .filter((e): e is WorldCharacterEventRow => e !== null);
}
