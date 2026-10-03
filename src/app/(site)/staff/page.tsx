import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 站務人員個人頁的穩定連結——全站頁尾直接連來這裡,而不是寫死
 * /u/[username],這樣站務的公開個人頁網址代號(username)不管怎麼改,
 * 頁尾的連結都不用跟著改,永遠導去 site_settings.staff_contact_username
 * 目前指到的那個人的個人頁。
 *
 * 這一欄本身就是 username(不是 display_name)——改成站務自己在
 * /dashboard/admin/homepage 後台設定要指到誰,不是寫死在程式碼裡,見
 * migration 039:這個連結之前就是因為寫死在程式碼裡比對一個固定字串,
 * 站務改了顯示名稱之後連結跟著失效,才改成這樣。
 */
export default async function StaffContactRedirect() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("staff_contact_username")
    .eq("id", true)
    .maybeSingle();

  if (!settings?.staff_contact_username) notFound();
  redirect(`/u/${settings.staff_contact_username}`);
}
