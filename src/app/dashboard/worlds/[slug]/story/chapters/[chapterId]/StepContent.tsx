import Link from "next/link";
import { Fragment } from "react";

/**
 * 時間軸段落的自訂文案(custom_text)——段落不再強制綁 node_id,改成
 * 作者自己在文字裡用 [[節點名稱]](跟 nodes.content 的 WikiLink 語法
 * 一致,見 WikiLinkContent.tsx)或一般 markdown 連結語法
 * [顯示文字](網址) 連去任何節點或外部網址。
 *
 * [[節點名稱]] 用「同一個世界觀內標題完全相符」去比對(呼叫端傳入的
 * links 是這個世界觀所有節點的 title→slug 對照表,只查不到才會原樣
 * 顯示 [[名稱]],不像 nodes.content 那個 sync_node_wikilinks trigger
 * 會自動建立佔位節點——段落文字比較隨手,不該無意間動到正式節點資料。
 *
 * [文字](網址) 的網址只接受 /開頭的站內相對路徑,或 http(s):// 開頭的
 * 外部網址,其餘一律當純文字顯示,避免 javascript: 之類的網址被當成
 * 連結執行。
 */
export function StepContent({
  content,
  basePath,
  links,
}: {
  content: string;
  basePath: string;
  links: Map<string, { slug: string; isPlaceholder: boolean }>;
}) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // 兩種語法用同一個 regex 找,[[..]] 放前面優先比對,避免 [文字](網址)
  // 那條把 [[名稱]] 的外層中括號吃掉一半。
  const pattern = /\[\[([^[\]]+)\]\]|\[([^[\]]+)\]\(([^\s()]+)\)/g;
  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={key++}>{content.slice(lastIndex, match.index)}</Fragment>);
    }

    if (match[1] !== undefined) {
      const name = match[1].trim();
      const target = links.get(name);
      if (target) {
        parts.push(
          <Link
            key={key++}
            href={`${basePath}/${target.slug}`}
            className={
              target.isPlaceholder
                ? "text-muted-foreground italic underline decoration-dotted"
                : "text-badge-info-fg underline decoration-badge-info-fg/50"
            }
          >
            {name}
          </Link>,
        );
      } else {
        parts.push(<Fragment key={key++}>[[{name}]]</Fragment>);
      }
    } else {
      const text = match[2];
      const url = match[3];
      if (url.startsWith("/")) {
        parts.push(
          <Link
            key={key++}
            href={url}
            className="text-badge-info-fg underline decoration-badge-info-fg/50"
          >
            {text}
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
            {text}
          </a>,
        );
      } else {
        parts.push(<Fragment key={key++}>{match[0]}</Fragment>);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(<Fragment key={key++}>{content.slice(lastIndex)}</Fragment>);
  }

  return <p className="mt-1 whitespace-pre-wrap">{parts}</p>;
}
