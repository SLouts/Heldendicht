import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { fetchSiteSettings } from "@/lib/siteSettings";
import { SiteSettingsForm } from "./SiteSettingsForm";

export default async function SiteHomepageSettingsPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");

  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">首頁內容</h1>
      </div>
    );
  }

  const settings = await fetchSiteSettings(supabase);

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">首頁內容</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        編輯首頁 Hero 區塊、平台特色三張卡片、底部 CTA 區塊的文字。「全站最新動態」是即時查詢,不在這裡編輯;CTA 的按鈕(登入/註冊/建立世界觀等)是跟登入狀態綁定的功能性連結,也不開放自訂。
      </p>
      <SiteSettingsForm
        heroTitle={settings.hero_title}
        heroTagline={settings.hero_tagline}
        disclaimerContent={settings.disclaimer_content}
        feature1Title={settings.feature1_title}
        feature1Description={settings.feature1_description}
        feature2Title={settings.feature2_title}
        feature2Description={settings.feature2_description}
        feature3Title={settings.feature3_title}
        feature3Description={settings.feature3_description}
        ctaHeading={settings.cta_heading}
        ctaDescriptionGuest={settings.cta_description_guest}
        ctaDescriptionMember={settings.cta_description_member}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/admin" className="text-sm text-muted-foreground hover:underline">
      ← 返回站務
    </Link>
  );
}
