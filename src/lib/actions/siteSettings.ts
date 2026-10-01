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

/**
 * 首頁文案(標題/標語/測試版公告)——只有站務能改,交給
 * site_settings_update 這條 RLS policy(限 is_site_admin())把關,這裡
 * 不重複檢查。全站只有這一列資料(見 migration 032 的單例表設計),
 * 不需要 id 參數,update 時不帶 .eq() 條件也只會動到那一列。
 */
export async function updateSiteSettings(
  _prevState: SiteSettingsFormState,
  formData: FormData,
): Promise<SiteSettingsFormState> {
  await requireUser();

  const heroTitle = HeroTitleSchema.safeParse(formData.get("heroTitle") ?? "");
  const heroTagline = HeroTaglineSchema.safeParse(formData.get("heroTagline") ?? "");
  const disclaimerContent = DisclaimerSchema.safeParse(formData.get("disclaimerContent") ?? "");
  if (!heroTitle.success || !heroTagline.success || !disclaimerContent.success) {
    return {
      fieldErrors: {
        ...(heroTitle.success ? {} : { heroTitle: [heroTitle.error.issues[0].message] }),
        ...(heroTagline.success ? {} : { heroTagline: [heroTagline.error.issues[0].message] }),
        ...(disclaimerContent.success
          ? {}
          : { disclaimerContent: [disclaimerContent.error.issues[0].message] }),
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      hero_title: heroTitle.data,
      hero_tagline: heroTagline.data,
      disclaimer_content: disclaimerContent.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) {
    return { error: "儲存失敗,請確認你是站務管理員" };
  }

  revalidatePath("/");
  return undefined;
}
