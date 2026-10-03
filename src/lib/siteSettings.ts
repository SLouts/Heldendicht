import type { createClient } from "@/lib/supabase/server";

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
 * 查首頁「平台特色」卡片清單(migration 040)——數量不固定,照
 * order_index 排序。migration 040 套用前這張表還不存在,select 會直接
 * 失敗,這裡當作「還沒有任何卡片」,首頁的卡片區塊就不會顯示,不影響
 * 其餘既有內容。
 */
export async function fetchSiteFeatureCards(
  supabase: SupabaseServerClient,
): Promise<SiteFeatureCardItem[]> {
  const result = await supabase
    .from("site_feature_cards")
    .select("id, label, content")
    .order("order_index", { ascending: true });
  return result.data ?? [];
}
