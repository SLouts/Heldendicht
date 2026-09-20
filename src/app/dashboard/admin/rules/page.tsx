import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { SiteRuleFieldsEditor } from "./SiteRuleFieldsEditor";

export default async function SiteRulesPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: isSiteAdmin } = await supabase.rpc("is_site_admin");

  if (!isSiteAdmin) {
    return (
      <div>
        <BackLink />
        <h1 className="mt-2 text-2xl font-semibold">全站規則</h1>
      </div>
    );
  }

  const { data: fields } = await supabase
    .from("site_rule_fields")
    .select("id, label, content")
    .order("order_index", { ascending: true });

  return (
    <div>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">全站規則</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        投稿或使用這個網站要遵守的規定、授權或權利聲明,任何人(含未登入訪客)都會在每個世界觀頁面看到,跟世界觀自己的規則並列顯示。
      </p>
      <SiteRuleFieldsEditor fields={fields ?? []} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
      ← 回後台首頁
    </Link>
  );
}
