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
  year_start_month: number | null;
  year_start_day: number | null;
  year_end_month: number | null;
  year_end_day: number | null;
};

/**
 * 查「企劃時間軸」(scope='official')章節,照年份排序。
 *
 * 三段式退回,對應兩次獨立的 migration:
 *   1. 完整查詢(含 034 的 year_start/year_end + 035 的月/日)。
 *   2. 035 還沒套用——退回只查 034 的年份欄位,月/日當 null。
 *   3. 034 也還沒套用——退回完全不含年份的舊版查詢。
 * 讓既有的章節清單不管套用到哪個階段都還能正常顯示。
 */
export async function fetchOfficialChapters(
  supabase: SupabaseServerClient,
  worldId: string,
): Promise<OfficialChapterRow[]> {
  const full = await supabase
    .from("story_chapters")
    .select(
      "id, title, description, order_index, year_start, year_end, year_start_month, year_start_day, year_end_month, year_end_day",
    )
    .eq("world_id", worldId)
    .eq("scope", "official")
    .order("year_start", { ascending: true, nullsFirst: false })
    .order("order_index", { ascending: true });
  if (!full.error) return full.data ?? [];

  const yearOnly = await supabase
    .from("story_chapters")
    .select("id, title, description, order_index, year_start, year_end")
    .eq("world_id", worldId)
    .eq("scope", "official")
    .order("year_start", { ascending: true, nullsFirst: false })
    .order("order_index", { ascending: true });
  if (!yearOnly.error) {
    return (yearOnly.data ?? []).map((c) => ({
      ...c,
      year_start_month: null,
      year_start_day: null,
      year_end_month: null,
      year_end_day: null,
    }));
  }

  const none = await supabase
    .from("story_chapters")
    .select("id, title, description, order_index")
    .eq("world_id", worldId)
    .eq("scope", "official")
    .order("order_index", { ascending: true });
  return (none.data ?? []).map((c) => ({
    ...c,
    year_start: null,
    year_end: null,
    year_start_month: null,
    year_start_day: null,
    year_end_month: null,
    year_end_day: null,
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
  world_year_month: number | null;
  world_year_day: number | null;
};

/**
 * 查單一角色節點自己的時間軸事件(含 world_year 跟月/日)——跟
 * fetchWorldCharacterTimelineEvents 不同,這裡是給角色節點自己的頁面用
 * (顯示 CharacterTimelineDisplay/Editor,不分有沒有填世界觀年份)。
 *
 * 同樣三段式退回(034/035 各自可能還沒套用),見 fetchOfficialChapters。
 */
export async function fetchCharacterTimelineEvents(
  supabase: SupabaseServerClient,
  nodeId: string,
): Promise<CharacterTimelineEventRow[]> {
  const full = await supabase
    .from("character_timeline_events")
    .select(
      "id, label, description, content, image_path, is_spoiler, world_year, world_year_month, world_year_day",
    )
    .eq("node_id", nodeId)
    .order("order_index", { ascending: true });
  if (!full.error) return full.data ?? [];

  const yearOnly = await supabase
    .from("character_timeline_events")
    .select("id, label, description, content, image_path, is_spoiler, world_year")
    .eq("node_id", nodeId)
    .order("order_index", { ascending: true });
  if (!yearOnly.error) {
    return (yearOnly.data ?? []).map((e) => ({
      ...e,
      world_year_month: null,
      world_year_day: null,
    }));
  }

  const none = await supabase
    .from("character_timeline_events")
    .select("id, label, description, content, image_path, is_spoiler")
    .eq("node_id", nodeId)
    .order("order_index", { ascending: true });
  return (none.data ?? []).map((e) => ({
    ...e,
    world_year: null,
    world_year_month: null,
    world_year_day: null,
  }));
}

/**
 * 查主辦為這個世界觀設定的「企劃時間軸要呈現的起迄年份」——有設定(兩欄
 * 都填)就讓畫面優先用這組範圍當軸線端點,不是自動從目前的章節/時間點
 * 資料算最小最大值(詳見 migration 034 的說明)。只填其中一欄(開放式
 * 區間)視同沒設定,退回自動計算,避免再處理「只知道一端,另一端要從
 * 哪裡補」這種額外分支。
 *
 * migration 034 套用前 worlds 還沒有這兩欄,select 會失敗——這裡接住
 * 失敗當作「沒設定」,不影響既有的世界觀頁面。
 */
export async function fetchWorldStoryTimelineRange(
  supabase: SupabaseServerClient,
  worldId: string,
): Promise<{ start: number; end: number } | null> {
  const result = await supabase
    .from("worlds")
    .select("story_timeline_year_start, story_timeline_year_end")
    .eq("id", worldId)
    .maybeSingle();
  if (result.error || !result.data) return null;

  const { story_timeline_year_start, story_timeline_year_end } = result.data;
  if (story_timeline_year_start == null || story_timeline_year_end == null) return null;
  return { start: story_timeline_year_start, end: story_timeline_year_end };
}

export type WorldCharacterEventRow = {
  id: string;
  label: string;
  description: string;
  is_spoiler: boolean;
  world_year: number;
  world_year_month: number | null;
  world_year_day: number | null;
  character_title: string;
  character_slug: string;
};

/**
 * 查這個世界觀底下所有角色節點、已經填了「世界觀年份」的時間點——
 * 用來跟官方章節並排顯示在企劃時間軸上。
 *
 * migration 034 套用前 character_timeline_events 還沒有 world_year 這欄,
 * select 會失敗,這裡直接當作「沒有任何角色時間點要顯示」,不影響其餘
 * 既有功能(角色自己頁面上的時間軸完全不走這條查詢)。035 的月/日欄位
 * 用同一套「失敗就當作沒填」的邏輯接住,不需要額外一層退回。
 */
export async function fetchWorldCharacterTimelineEvents(
  supabase: SupabaseServerClient,
  worldId: string,
): Promise<WorldCharacterEventRow[]> {
  const full = await supabase
    .from("character_timeline_events")
    .select(
      "id, label, description, is_spoiler, world_year, world_year_month, world_year_day, node:nodes!inner(title, slug, world_id, node_type)",
    )
    .eq("node.world_id", worldId)
    .eq("node.node_type", "character")
    .not("world_year", "is", null)
    .order("world_year", { ascending: true });

  const result = full.error
    ? await supabase
        .from("character_timeline_events")
        .select(
          "id, label, description, is_spoiler, world_year, node:nodes!inner(title, slug, world_id, node_type)",
        )
        .eq("node.world_id", worldId)
        .eq("node.node_type", "character")
        .not("world_year", "is", null)
        .order("world_year", { ascending: true })
    : full;

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
        world_year_month: "world_year_month" in e ? e.world_year_month : null,
        world_year_day: "world_year_day" in e ? e.world_year_day : null,
        character_title: node.title,
        character_slug: node.slug,
      };
    })
    .filter((e): e is WorldCharacterEventRow => e !== null);
}
