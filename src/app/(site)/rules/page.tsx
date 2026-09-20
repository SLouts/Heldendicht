import { createClient } from "@/lib/supabase/server";
import { RuleFieldItem } from "@/components/RuleFieldItem";

/**
 * 全站規則的獨立公開頁——只列站方(site_admin)定義的規則,不含各世界觀
 * 自己的規則(那些只顯示在各自的世界觀頁面)。首頁最下方的註腳會連來
 * 這裡,`site_rule_fields_select` RLS 對任何人(含未登入訪客)都開放。
 */
export default async function SiteRulesPage() {
  const supabase = await createClient();
  const { data: rules } = await supabase
    .from("site_rule_fields")
    .select("id, label, content")
    .order("order_index", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">全站規則</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        投稿或使用這個網站要遵守的規定、授權或權利聲明。各世界觀自己的規則另外顯示在該世界觀的頁面上。
      </p>
      {rules && rules.length > 0 ? (
        <ul className="mt-6 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface px-4">
          {rules.map((rule) => (
            <RuleFieldItem key={rule.id} rule={rule} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">目前還沒有設定全站規則。</p>
      )}
    </div>
  );
}
