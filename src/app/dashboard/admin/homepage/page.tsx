import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { fetchSiteSettings, fetchSiteFeatureCards } from "@/lib/siteSettings";
import { OrderedContentEditor } from "@/components/OrderedContentEditor";
import {
  createSiteFeatureCard,
  deleteSiteFeatureCard,
  moveSiteFeatureCard,
  updateSiteFeatureCard,
} from "@/lib/actions/siteFeatureCards";
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

  const [settings, featureCards] = await Promise.all([
    fetchSiteSettings(supabase),
    fetchSiteFeatureCards(supabase),
  ]);

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">首頁內容</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        編輯首頁 Hero 區塊、底部 CTA 區塊的文字,以及全站頁尾「聯繫站務人員」連結要導去的帳號。「全站最新動態」是即時查詢,不在這裡編輯;CTA 的按鈕(登入/註冊/建立世界觀等)是跟登入狀態綁定的功能性連結,也不開放自訂。
      </p>
      <SiteSettingsForm
        heroTitle={settings.hero_title}
        heroTagline={settings.hero_tagline}
        disclaimerContent={settings.disclaimer_content}
        ctaHeading={settings.cta_heading}
        ctaDescriptionGuest={settings.cta_description_guest}
        ctaDescriptionMember={settings.cta_description_member}
        staffContactUsername={settings.staff_contact_username ?? ""}
      />

      <div className="mt-10 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">What&apos;s New 卡片</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          首頁「What&apos;s New」區塊的卡片清單,數量不限,可以新增/刪除/排序。內容支援簡易
          markdown,要推廣某個世界觀就直接在內容裡放
          [文字](/worlds/該世界觀slug) 連結。
        </p>
        <OrderedContentEditor
          items={featureCards}
          createAction={createSiteFeatureCard}
          updateAction={updateSiteFeatureCard}
          onDelete={deleteSiteFeatureCard}
          onMove={moveSiteFeatureCard}
          newLabel="新增卡片"
          newLabelPlaceholder="例如「10 月更新公告」"
          emptyText="還沒有設定任何特色卡片,首頁不會顯示這個區塊。"
        />
      </div>
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
