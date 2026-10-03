"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type SiteSettingsFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const HeroTitleSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入標題" })
  .max(60, { error: "標題最多 60 字" });

const HeroTaglineSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入標語" })
  .max(200, { error: "標語最多 200 字" });

const DisclaimerSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入公告文字" })
  .max(2000, { error: "公告文字最多 2000 字" });

const CtaHeadingSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入標題" })
  .max(60, { error: "標題最多 60 字" });

const CtaDescriptionSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入說明文字" })
  .max(300, { error: "說明文字最多 300 字" });

// 跟 profile.ts 的 UsernameSchema 同一套規則(網址代號格式),留空代表
// 清空設定(/staff 連結查不到人,維持 404)。
const StaffContactUsernameSchema = z.union([
  z.string().regex(/^[a-z0-9_-]{3,20}$/, {
    error: "網址代號只能用小寫英文、數字、底線與連字號,長度 3~20",
  }),
  z.literal(""),
]);

const SITE_SETTINGS_FIELDS = [
  ["heroTitle", HeroTitleSchema],
  ["heroTagline", HeroTaglineSchema],
  ["disclaimerContent", DisclaimerSchema],
  ["ctaHeading", CtaHeadingSchema],
  ["ctaDescriptionGuest", CtaDescriptionSchema],
  ["ctaDescriptionMember", CtaDescriptionSchema],
] as const;

/**
 * 首頁文案(Hero 標題/標語/測試版公告 + 底部 CTA 標題/說明文字 + 站務
 * 聯絡人 username)——只有站務能改,交給 site_settings_update 這條 RLS
 * policy(限 is_site_admin())把關,這裡不重複檢查。全站只有這一列資料
 * (見 migration 032 的單例表設計),不需要 id 參數,update 時不帶
 * .eq() 條件也只會動到那一列。「平台特色」卡片(migration 040 起)是
 * 獨立的清單,改在 siteFeatureCards.ts 管理,不在這份表單裡。
 *
 * 六個固定欄位共用同一套「每個都必填、各自長度上限」的驗證形狀,用一張
 * [formKey, schema] 對照表跑迴圈驗證;staffContactUsername 允許空字串
 * (清空設定),格式規則單獨驗證。
 */
export async function updateSiteSettings(
  _prevState: SiteSettingsFormState,
  formData: FormData,
): Promise<SiteSettingsFormState> {
  await requireUser();

  const fieldErrors: Record<string, string[]> = {};
  const values: Record<string, string> = {};
  for (const [key, schema] of SITE_SETTINGS_FIELDS) {
    const parsed = schema.safeParse(formData.get(key) ?? "");
    if (!parsed.success) {
      fieldErrors[key] = [parsed.error.issues[0].message];
    } else {
      values[key] = parsed.data;
    }
  }
  const staffContactUsername = StaffContactUsernameSchema.safeParse(
    formData.get("staffContactUsername") ?? "",
  );
  if (!staffContactUsername.success) {
    fieldErrors.staffContactUsername = [staffContactUsername.error.issues[0].message];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const basePayload = {
    hero_title: values.heroTitle,
    hero_tagline: values.heroTagline,
    disclaimer_content: values.disclaimerContent,
    updated_at: new Date().toISOString(),
  };
  const ctaPayload = {
    cta_heading: values.ctaHeading,
    cta_description_guest: values.ctaDescriptionGuest,
    cta_description_member: values.ctaDescriptionMember,
  };

  // migration 038/039 套用前 site_settings 還沒有 cta_*/staff_contact_
  // username 這幾欄,update 會直接失敗——依序接住失敗,退回更少欄位的
  // update,讓站務在套用 migration 之前至少還能改 Hero 區塊,不會整個
  // 表單都存不進去。
  const full = await supabase
    .from("site_settings")
    .update({
      ...basePayload,
      ...ctaPayload,
      staff_contact_username: staffContactUsername.data! || null,
    })
    .eq("id", true);

  const withoutStaffContact = full.error
    ? await supabase
        .from("site_settings")
        .update({ ...basePayload, ...ctaPayload })
        .eq("id", true)
    : full;

  const { error } = withoutStaffContact.error
    ? await supabase.from("site_settings").update(basePayload).eq("id", true)
    : withoutStaffContact;
  if (error) {
    return { error: "儲存失敗,請確認你是站務管理員" };
  }

  revalidatePath("/");
  revalidatePath("/staff");
  return undefined;
}
