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

const FeatureTitleSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入標題" })
  .max(40, { error: "標題最多 40 字" });

const FeatureDescriptionSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入說明文字" })
  .max(300, { error: "說明文字最多 300 字" });

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

const SITE_SETTINGS_FIELDS = [
  ["heroTitle", HeroTitleSchema],
  ["heroTagline", HeroTaglineSchema],
  ["disclaimerContent", DisclaimerSchema],
  ["feature1Title", FeatureTitleSchema],
  ["feature1Description", FeatureDescriptionSchema],
  ["feature2Title", FeatureTitleSchema],
  ["feature2Description", FeatureDescriptionSchema],
  ["feature3Title", FeatureTitleSchema],
  ["feature3Description", FeatureDescriptionSchema],
  ["ctaHeading", CtaHeadingSchema],
  ["ctaDescriptionGuest", CtaDescriptionSchema],
  ["ctaDescriptionMember", CtaDescriptionSchema],
] as const;

/**
 * 首頁文案(Hero 標題/標語/測試版公告 + 平台特色三張卡片 + 底部 CTA
 * 標題/說明文字)——只有站務能改,交給 site_settings_update 這條 RLS
 * policy(限 is_site_admin())把關,這裡不重複檢查。全站只有這一列資料
 * (見 migration 032 的單例表設計),不需要 id 參數,update 時不帶
 * .eq() 條件也只會動到那一列。
 *
 * 九個欄位共用同一套「每個都必填、各自長度上限」的驗證形狀,用一張
 * [formKey, schema] 對照表跑迴圈驗證,避免十二組幾乎一樣的
 * safeParse/fieldErrors 樣板重複十二次。
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

  // migration 038 套用前 site_settings 還沒有 feature*/cta_* 這幾欄,
  // update 會直接失敗——接住那個失敗,退回只存 Hero 那三欄,讓站務在
  // 套用 migration 之前至少還能改 Hero 區塊,不會整個表單都存不進去。
  const withNewFields = await supabase
    .from("site_settings")
    .update({
      ...basePayload,
      feature1_title: values.feature1Title,
      feature1_description: values.feature1Description,
      feature2_title: values.feature2Title,
      feature2_description: values.feature2Description,
      feature3_title: values.feature3Title,
      feature3_description: values.feature3Description,
      cta_heading: values.ctaHeading,
      cta_description_guest: values.ctaDescriptionGuest,
      cta_description_member: values.ctaDescriptionMember,
    })
    .eq("id", true);

  const { error } = withNewFields.error
    ? await supabase.from("site_settings").update(basePayload).eq("id", true)
    : withNewFields;
  if (error) {
    return { error: "儲存失敗,請確認你是站務管理員" };
  }

  revalidatePath("/");
  return undefined;
}
