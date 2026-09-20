import { MarkdownLinkText } from "./MarkdownLinkText";

/** 一則規則(標題+說明文字),世界觀規則清單/全站規則頁共用。內文支援
 * markdown 連結語法 [文字](網址)。 */
export function RuleFieldItem({
  rule,
  scopeLabel,
}: {
  rule: { id: string; label: string; content: string };
  scopeLabel?: string;
}) {
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{rule.label}</span>
        {scopeLabel && (
          <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
            {scopeLabel}
          </span>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
        <MarkdownLinkText text={rule.content} />
      </p>
    </li>
  );
}
