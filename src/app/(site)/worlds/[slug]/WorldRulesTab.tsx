import Link from "next/link";
import { RuleFieldItem } from "@/components/RuleFieldItem";

type Rule = { id: string; label: string; content: string };

/**
 * 「企劃規則與手冊」分頁——只顯示這個世界觀自己的規則(world_rule_fields),
 * 不重複顯示全站規則(site_rule_fields)——全站規則已經有獨立的公開頁面
 * `/rules`,這裡只留一個連結過去,不要每個世界觀首頁都各自重複列一次
 * 同樣的全站規則內容。
 *
 * manageHref 是後台版才會用到的「管理規則」編輯連結,公開版不傳就不顯示。
 */
export function WorldRulesTab({
  worldRules,
  manageHref,
}: {
  worldRules: Rule[] | null | undefined;
  manageHref?: string;
}) {
  const hasRules = (worldRules?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          投稿或使用這個世界觀要遵守的規定、授權或權利聲明。
        </p>
        <div className="flex items-center gap-3 text-sm">
          {manageHref && (
            <Link href={manageHref} className="underline">
              管理規則
            </Link>
          )}
          <Link href="/rules" className="underline">
            查看全站規則 →
          </Link>
        </div>
      </div>

      {hasRules ? (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {worldRules?.map((rule) => <RuleFieldItem key={rule.id} rule={rule} />)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">這個世界觀還沒有設定自己的規則。</p>
      )}
    </div>
  );
}
