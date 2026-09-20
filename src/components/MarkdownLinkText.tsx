import Link from "next/link";
import { Fragment } from "react";

/**
 * 把文字裡的 markdown 連結語法 [文字](網址) 轉成可點擊連結——用在規則
 * 欄位(site_rule_fields/world_rule_fields)這種不一定屬於單一世界觀的
 * 內容,所以不支援 [[節點名稱]] WikiLink 語法(那需要指定要在哪個世界觀
 * 底下比對標題)。網址只接受 /開頭的站內相對路徑,或 http(s):// 開頭的
 * 外部網址,其餘一律當純文字顯示,避免 javascript: 之類的網址被當成
 * 連結執行。
 */
export function MarkdownLinkText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  const pattern = /\[([^[\]]+)\]\(([^\s()]+)\)/g;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }

    const label = match[1];
    const url = match[2];
    if (url.startsWith("/")) {
      parts.push(
        <Link
          key={key++}
          href={url}
          className="text-badge-info-fg underline decoration-badge-info-fg/50"
        >
          {label}
        </Link>,
      );
    } else if (/^https?:\/\//i.test(url)) {
      parts.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-badge-info-fg underline decoration-badge-info-fg/50"
        >
          {label}
        </a>,
      );
    } else {
      parts.push(<Fragment key={key++}>{match[0]}</Fragment>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return <>{parts}</>;
}
