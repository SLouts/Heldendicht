import { RuleFieldItem } from "@/components/RuleFieldItem";

type Rule = { id: string; label: string; content: string };

/**
 * 「企劃規則與手冊」分頁——世界觀自訂規則(world_rule_fields)並列全站
 * 公約(site_rule_fields)。原本首頁用 CollapsibleSection 包一層再展開,
 * 現在已經是獨立分頁(使用者點進來就是想看規則),不用再多一層收合。
 */
export function WorldRulesTab({
  worldRules,
  siteRules,
}: {
  worldRules: Rule[] | null | undefined;
  siteRules: Rule[] | null | undefined;
}) {
  const hasRules = (worldRules?.length ?? 0) > 0 || (siteRules?.length ?? 0) > 0;

  if (!hasRules) {
    return <p className="text-sm text-muted-foreground">這個世界觀還沒有設定規則。</p>;
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        投稿或使用這個網站/這個世界觀要遵守的規定、授權或權利聲明。
      </p>
      <ul className="mt-3 flex flex-col divide-y divide-border">
        {worldRules?.map((rule) => <RuleFieldItem key={rule.id} rule={rule} />)}
        {siteRules?.map((rule) => <RuleFieldItem key={rule.id} rule={rule} scopeLabel="全站" />)}
      </ul>
    </div>
  );
}
