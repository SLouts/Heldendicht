import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 站務人員個人頁的穩定連結——全站頁尾直接連來這裡,而不是寫死
 * /u/[username],這樣即使站務人員之後改了 username(公開個人頁面的
 * 網址代號),頁尾的連結也不會失效,永遠導去她目前的個人頁。
 *
 * 用 display_name 比對,不是 username——username 正是「會改」的那個
 * 欄位,不能拿來當穩定識別依據。
 */
export default async function StaffContactRedirect() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("display_name", "裴臨暮")
    .limit(1)
    .maybeSingle();

  if (!profile?.username) notFound();
  redirect(`/u/${profile.username}`);
}
