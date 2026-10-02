import type { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";
import type { StoryChapterSubmissionStatus } from "@/lib/supabase/database.types";

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

export type ChapterParticipant = {
  character_node_id: string;
  title: string;
  slug: string;
};

/**
 * 查這個世界觀所有官方章節各自標記了哪些角色參與("副本")——給世界觀
 * 整體時間軸的章節列表用,一次查完整個世界觀,不用每個章節各自查一次。
 *
 * migration 036 套用前這張表還不存在,select 會失敗,這裡當作「沒有
 * 任何章節標記了參與者」,不影響既有的章節清單顯示。
 */
export async function fetchOfficialChapterParticipants(
  supabase: SupabaseServerClient,
  worldId: string,
): Promise<Map<string, ChapterParticipant[]>> {
  const result = await supabase
    .from("story_chapter_participants")
    .select(
      "chapter_id, character:nodes!story_chapter_participants_character_node_id_fkey(id, title, slug), chapter:story_chapters!inner(world_id, scope)",
    )
    .eq("chapter.world_id", worldId)
    .eq("chapter.scope", "official");

  const map = new Map<string, ChapterParticipant[]>();
  if (result.error || !result.data) return map;

  for (const row of result.data) {
    const character = unwrapRelation(row.character);
    if (!character) continue;
    const list = map.get(row.chapter_id) ?? [];
    list.push({ character_node_id: character.id, title: character.title, slug: character.slug });
    map.set(row.chapter_id, list);
  }
  return map;
}

/**
 * 查單一章節標記了哪些角色參與——給章節詳細頁用(顯示參與名單 +
 * 編輯表單預先勾選)。
 */
export async function fetchChapterParticipants(
  supabase: SupabaseServerClient,
  chapterId: string,
): Promise<ChapterParticipant[]> {
  const result = await supabase
    .from("story_chapter_participants")
    .select(
      "character_node_id, character:nodes!story_chapter_participants_character_node_id_fkey(title, slug)",
    )
    .eq("chapter_id", chapterId);
  if (result.error || !result.data) return [];

  return result.data
    .map((row) => {
      const character = unwrapRelation(row.character);
      return character
        ? { character_node_id: row.character_node_id, title: character.title, slug: character.slug }
        : null;
    })
    .filter((p): p is ChapterParticipant => p !== null);
}

export type CharacterParticipantChapterRow = {
  id: string;
  title: string;
  description: string | null;
  year_start: number | null;
  year_start_month: number | null;
  year_start_day: number | null;
  year_end: number | null;
  year_end_month: number | null;
  year_end_day: number | null;
};

/**
 * 查這個角色節點被標記參與的所有官方章節("副本")——給角色自己的頁面
 * 用,顯示成唯讀的「共同副本」區塊,跟這個角色自己的 character_timeline_
 * events 個人時間點是分開的兩件事。
 *
 * migration 036 套用前這張表還不存在,select 會失敗,這裡當作「這個
 * 角色沒有被標記參與任何章節」,不影響既有的角色頁面顯示。
 */
export async function fetchCharacterParticipantChapters(
  supabase: SupabaseServerClient,
  nodeId: string,
): Promise<CharacterParticipantChapterRow[]> {
  const result = await supabase
    .from("story_chapter_participants")
    .select(
      "chapter:story_chapters!inner(id, title, description, year_start, year_start_month, year_start_day, year_end, year_end_month, year_end_day)",
    )
    .eq("character_node_id", nodeId);
  if (result.error || !result.data) return [];

  return result.data
    .map((row) => unwrapRelation(row.chapter))
    .filter((c): c is CharacterParticipantChapterRow => c !== null)
    .sort((a, b) => (a.year_start ?? Infinity) - (b.year_start ?? Infinity));
}

export type ChapterSubmissionRow = {
  id: string;
  chapter_id: string;
  character_node_id: string | null;
  character_title: string | null;
  character_slug: string | null;
  status: StoryChapterSubmissionStatus;
  content: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  updated_at: string;
};

/**
 * 查一個章節底下所有的「副本」投稿(個人投稿 + 共同投稿),給章節詳細頁
 * 用——哪些列查得到完全交給 story_chapter_submissions_select RLS 決定
 * (staff 看全部;同一副本的參與角色看得到這個章節底下所有投稿,不限
 * 狀態;其他人只看得到已核准的),這裡不另外收斂。
 *
 * migration 037 套用前這張表還不存在,select 會失敗,這裡當作「還沒有
 * 任何投稿」,不影響既有的章節詳細頁顯示。
 */
export async function fetchChapterSubmissions(
  supabase: SupabaseServerClient,
  chapterId: string,
): Promise<ChapterSubmissionRow[]> {
  const result = await supabase
    .from("story_chapter_submissions")
    .select(
      "id, chapter_id, character_node_id, status, content, submitted_at, reviewed_at, review_note, updated_at, character:nodes(title, slug)",
    )
    .eq("chapter_id", chapterId)
    .order("created_at", { ascending: true });
  if (result.error || !result.data) return [];

  return result.data.map((row) => {
    const character = unwrapRelation(row.character);
    return {
      id: row.id,
      chapter_id: row.chapter_id,
      character_node_id: row.character_node_id,
      character_title: character?.title ?? null,
      character_slug: character?.slug ?? null,
      status: row.status,
      content: row.content,
      submitted_at: row.submitted_at,
      reviewed_at: row.reviewed_at,
      review_note: row.review_note,
      updated_at: row.updated_at,
    };
  });
}

export type CharacterApprovedSubmissionRow = {
  id: string;
  chapter_id: string;
  chapter_title: string;
  content: string;
  updated_at: string;
};

/**
 * 查這個角色節點自己、已核准公開的「副本」投稿內容——給角色自己的頁面
 * 用,顯示在共同副本區塊裡每個章節底下(不是只顯示連結,實際內文也
 * 顯示出來)。只查 status='approved',草稿/送審中/被退回的版本不會出現
 * 在這裡(那些只有本人、同副本參與者、staff 在章節詳細頁看得到)。
 * href 由呼叫端自己組(dashboard/public 路徑不同),跟
 * fetchCharacterParticipantChapters 同一套慣例。
 *
 * migration 037 套用前這張表還不存在,select 會失敗,這裡當作「這個
 * 角色還沒有任何已核准的投稿」,不影響既有的角色頁面顯示。
 */
export async function fetchCharacterApprovedSubmissions(
  supabase: SupabaseServerClient,
  nodeId: string,
): Promise<CharacterApprovedSubmissionRow[]> {
  const result = await supabase
    .from("story_chapter_submissions")
    .select("id, chapter_id, content, updated_at, chapter:story_chapters!inner(title)")
    .eq("character_node_id", nodeId)
    .eq("status", "approved");
  if (result.error || !result.data) return [];

  return result.data
    .map((row) => {
      const chapter = unwrapRelation(row.chapter);
      if (!chapter) return null;
      return {
        id: row.id,
        chapter_id: row.chapter_id,
        chapter_title: chapter.title,
        content: row.content,
        updated_at: row.updated_at,
      };
    })
    .filter((s): s is CharacterApprovedSubmissionRow => s !== null);
}
