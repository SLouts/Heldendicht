import type { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";
import { getWorldMediaSignedUrls } from "@/lib/worldMedia";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type SiteSettingsRow = {
  hero_title: string;
  hero_tagline: string;
  disclaimer_content: string;
  cta_heading: string;
  cta_description_guest: string;
  cta_description_member: string;
  staff_contact_username: string | null;
};

/**
 * 首頁文案寫死的預設值——跟 migration 032/038 的種子資料一致,套用
 * migration 前(表還沒有這幾欄,或整張表還沒種子資料)就是用這一份,
 * 讓首頁不會因為 site_settings 查詢失敗而顯示空白。「平台特色」卡片
 * (migration 040 起改放 site_feature_cards)不在這裡,見
 * fetchSiteFeatureCards。
 */
const DEFAULTS: SiteSettingsRow = {
  hero_title: "編織架空宇宙,記錄英雄敘事",
  hero_tagline: "跟其他玩家一起建立世界觀、經營角色,把設定跟故事留在同一個地方。",
  disclaimer_content:
    "Heldendicht 目前處於系統建置與公開測試階段。本站所有展示資料皆為測試用途,平台不對資料遺失、異常或非預期之系統變更負擔保責任,請創作者務必自行保留本地備份。投稿或瀏覽前請先閱讀[全站規則](/rules),若有系統問題或意見反饋,歡迎來信至 [heldendicht.cit@gmail.com](mailto:heldendicht.cit@gmail.com)。",
  cta_heading: "加入這裡,開始寫下你的故事",
  cta_description_guest: "註冊帳號,建立世界觀或加入別人的企劃,把設定跟角色寫進共筆世界。",
  cta_description_member: "建立一個新的世界觀,或去找一個喜歡的世界觀投稿角色。",
  staff_contact_username: null,
};

/**
 * 查首頁可編輯文案(Hero + CTA 區塊 + 站務聯絡人)——首頁本身跟
 * dashboard 的站務編輯頁共用這份查詢,避免兩邊各自寫一套 fallback 邏輯。
 *
 * 三段式退回,對應三個獨立套用的 migration:
 *   1. 完整查詢(含 038 的 cta_* + 039 的 staff_contact_username)。
 *   2. 039 還沒套用——退回只查 038 的 cta_* 跟 032 原本就有的三欄,
 *      staff_contact_username 當 null(/staff 連結維持 404,不影響其他
 *      頁面)。
 *   3. 038 也還沒套用——退回只查 032 原本就有的三欄。
 * 不管哪一段失敗,沒查到的欄位都落回跟目前畫面一致的寫死預設值
 * (DEFAULTS),讓首頁/編輯頁在套用 migration 之前都還能正常顯示。
 */
export async function fetchSiteSettings(
  supabase: SupabaseServerClient,
): Promise<SiteSettingsRow> {
  const full = await supabase
    .from("site_settings")
    .select(
      "hero_title, hero_tagline, disclaimer_content, cta_heading, cta_description_guest, cta_description_member, staff_contact_username",
    )
    .eq("id", true)
    .single();
  if (!full.error && full.data) return full.data;

  const withoutStaffContact = await supabase
    .from("site_settings")
    .select("hero_title, hero_tagline, disclaimer_content, cta_heading, cta_description_guest, cta_description_member")
    .eq("id", true)
    .single();
  if (!withoutStaffContact.error && withoutStaffContact.data) {
    return { ...withoutStaffContact.data, staff_contact_username: null };
  }

  const heroOnly = await supabase
    .from("site_settings")
    .select("hero_title, hero_tagline, disclaimer_content")
    .eq("id", true)
    .single();
  if (!heroOnly.error && heroOnly.data) {
    return {
      ...DEFAULTS,
      hero_title: heroOnly.data.hero_title,
      hero_tagline: heroOnly.data.hero_tagline,
      disclaimer_content: heroOnly.data.disclaimer_content,
    };
  }

  return DEFAULTS;
}

export type SiteFeatureCardItem = {
  id: string;
  label: string;
  content: string;
};

/**
 * 查首頁 What's New 區塊的文字卡片清單(migration 040)——只查
 * card_type='text' 的列,不含 migration 041 新增的「勾選世界觀」卡片
 * (那些用 fetchFeaturedWorldCards 另外查,形狀完全不同,世界觀卡片不是
 * OrderedContentEditor 能編輯的標題+內容形狀)。數量不固定,照
 * order_index 排序。
 *
 * migration 040 套用前這張表還不存在,select 會直接失敗,這裡當作
 * 「還沒有任何卡片」,首頁的卡片區塊就不會顯示,不影響其餘既有內容。
 */
export async function fetchSiteFeatureCards(
  supabase: SupabaseServerClient,
): Promise<SiteFeatureCardItem[]> {
  const result = await supabase
    .from("site_feature_cards")
    .select("id, label, content")
    .eq("card_type", "text")
    .order("order_index", { ascending: true });
  return result.data ?? [];
}

export type FeaturedWorldCardItem = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  bannerUrl: string | null;
  iconUrl: string | null;
};

/**
 * 查首頁 What's New 區塊被站務勾選展示的公開世界觀(migration 041)——
 * 不複製世界觀資料,每次都即時查 worlds 表目前的名稱/橫幅/一句話介紹,
 * 跟個人頁面的 WorldCard 共用同一套簽名 URL 邏輯(見 getWorldMediaSignedUrls
 * 的說明)。
 *
 * 可見度交給 worlds 本身的 RLS:用內嵌關聯查 world:worlds(...),如果那個
 * 世界觀後來被主辦改成非公開,內嵌關聯對一般訪客會是 null,這裡直接
 * 篩掉,不會把該世界觀的資料洩漏出去。
 *
 * migration 041 套用前 card_type/world_id 這兩欄還不存在,select 會直接
 * 失敗,這裡當作「還沒有任何世界觀卡片」。
 */
export async function fetchFeaturedWorldCards(
  supabase: SupabaseServerClient,
): Promise<FeaturedWorldCardItem[]> {
  const result = await supabase
    .from("site_feature_cards")
    .select("world:worlds(id, slug, name, tagline, banner_path, icon_path)")
    .eq("card_type", "world")
    .order("order_index", { ascending: true });
  if (result.error || !result.data) return [];

  const worlds = result.data
    .map((row) => unwrapRelation(row.world))
    .filter((w): w is NonNullable<typeof w> => w !== null);

  const mediaUrls = await getWorldMediaSignedUrls(worlds);
  return worlds.map((w, i) => ({
    id: w.id,
    slug: w.slug,
    name: w.name,
    tagline: w.tagline,
    bannerUrl: mediaUrls[i].bannerUrl,
    iconUrl: mediaUrls[i].iconUrl,
  }));
}
