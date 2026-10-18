import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { SlugMigrationRunner } from "./SlugMigrationRunner";

export const metadata: Metadata = { title: "補發條目代稱" };

/**
 * 一次性工具——標題帶中文字的節點,在拼音轉換邏輯上線前建立的話 slug
 * 完全看不出對應哪個標題(例如全部變成類似 daodan-xxxx 的隨機字串)。
 * 這裡觸發補發,舊網址會透過 node_slug_redirects 自動轉址到新網址,
 * 不用擔心既有連結(書籤、WikiLink、搜尋引擎索引)壞掉。
 *
 * 可以放心重複執行——已經補過的節點會被跳過,不會疊加改名。等確認
 * 全站標題都補完之後,這個頁面可以直接刪掉。
 */
export default async function SlugMigrationPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");
  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">補發條目代稱</h1>
      </div>
    );
  }

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">補發條目代稱</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        一次性工具:把標題帶中文字、代稱還看不出對應標題的條目改成拼音代稱,舊網址會自動轉址。
      </p>
      <SlugMigrationRunner />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/admin" className="text-sm text-muted-foreground hover:underline">
      ← 回站務首頁
    </Link>
  );
}
