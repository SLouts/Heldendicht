import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type SiteSettingsRow = {
  hero_title: string;
  hero_tagline: string;
  disclaimer_content: string;
  feature1_title: string;
  feature1_description: string;
  feature2_title: string;
  feature2_description: string;
  feature3_title: string;
  feature3_description: string;
  cta_heading: string;
  cta_description_guest: string;
  cta_description_member: string;
};

/**
 * 首頁文案寫死的預設值——跟 migration 032/038 的種子資料一致,套用
 * migration 前(表還沒有這幾欄,或整張表還沒種子資料)就是用這一份,
 * 讓首頁不會因為 site_settings 查詢失敗而顯示空白。
 */
const DEFAULTS: SiteSettingsRow = {
  hero_title: "編織架空宇宙,記錄英雄敘事",
  hero_tagline: "跟其他玩家一起建立世界觀、經營角色,把設定跟故事留在同一個地方。",
  disclaimer_content:
    "Heldendicht 目前處於系統建置與公開測試階段。本站所有展示資料皆為測試用途,平台不對資料遺失、異常或非預期之系統變更負擔保責任,請創作者務必自行保留本地備份。投稿或瀏覽前請先閱讀[全站規則](/rules),若有系統問題或意見反饋,歡迎來信至 [heldendicht.cit@gmail.com](mailto:heldendicht.cit@gmail.com)。",
  feature1_title: "8 款沉浸式美術主題",
  feature1_description:
    "泥金手抄本、羊皮紙卷軸、東方玄幻印章……八種風格隨時切換,同一份內容換一套視覺就像換了一本書。",
  feature2_title: "雙向連結與知識網絡",
  feature2_description:
    "內文用 [[條目名稱]] 就能連到其他節點,系統自動建立連結與反向關聯,連不到的名字會先開一個待撰寫的佔位節點。",
  feature3_title: "企劃協作與角色審查",
  feature3_description:
    "PC/NPC 配額、世界地圖標點、開放共筆或僅本人編輯——主辦跟編輯可以審核投稿,協作規則交給系統把關。",
  cta_heading: "加入這裡,開始寫下你的故事",
  cta_description_guest: "註冊帳號,建立世界觀或加入別人的企劃,把設定跟角色寫進共筆世界。",
  cta_description_member: "建立一個新的世界觀,或去找一個喜歡的世界觀投稿角色。",
};

/**
 * 查首頁可編輯文案(Hero + 平台特色卡片 + CTA 區塊)——首頁本身跟
 * dashboard 的站務編輯頁共用這份查詢,避免兩邊各自寫一套 fallback 邏輯。
 *
 * migration 038 套用前 site_settings 還沒有 feature1_title 等新欄位,
 * select 會直接失敗——接住那個失敗,退回只查 032 原本就有的三欄,新欄位
 * 一律落回跟目前畫面一致的寫死預設值(DEFAULTS),讓首頁/編輯頁在套用
 * migration 之前都還能正常顯示,只是編輯頁暫時看不到新欄位可以改。
 */
export async function fetchSiteSettings(
  supabase: SupabaseServerClient,
): Promise<SiteSettingsRow> {
  const full = await supabase
    .from("site_settings")
    .select(
      "hero_title, hero_tagline, disclaimer_content, feature1_title, feature1_description, feature2_title, feature2_description, feature3_title, feature3_description, cta_heading, cta_description_guest, cta_description_member",
    )
    .eq("id", true)
    .single();
  if (!full.error && full.data) return full.data;

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
