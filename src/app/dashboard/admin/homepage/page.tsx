import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
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

  const { data: settings } = await supabase
    .from("site_settings")
    .select("hero_title, hero_tagline, disclaimer_content")
    .eq("id", true)
    .single();

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">首頁內容</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        編輯首頁 Hero 區塊的標題、標語、測試版公告文字。「全站最新動態」是即時查詢,「平台特色」卡片跟底部 CTA 區塊目前還是固定內容,不在這裡編輯。
      </p>
      <SiteSettingsForm
        heroTitle={settings?.hero_title ?? ""}
        heroTagline={settings?.hero_tagline ?? ""}
        disclaimerContent={settings?.disclaimer_content ?? ""}
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
