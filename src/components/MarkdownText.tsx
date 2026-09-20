import Link from "next/link";
import { Fragment, type ReactNode } from "react";

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; ordered: boolean; items: string[] };

const ORDERED_ITEM = /^\s*\d+\.\s+(.*)$/;
const UNORDERED_ITEM = /^\s*[-*+]\s+(.*)$/;

function parseBlocks(text: string): Block[] {
  const rawLines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    const ordered = ORDERED_ITEM.exec(line);
    const unordered = UNORDERED_ITEM.exec(line);
    if (ordered || unordered) {
      const isOrdered = Boolean(ordered);
      const items = [(ordered ?? unordered)![1]];
      i++;
      while (i < rawLines.length) {
        const next = rawLines[i];
        const nextMatch = isOrdered ? ORDERED_ITEM.exec(next) : UNORDERED_ITEM.exec(next);
        if (!nextMatch) break;
        items.push(nextMatch[1]);
        i++;
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }

    const lines = [line];
    i++;
    while (
      i < rawLines.length &&
      rawLines[i].trim() !== "" &&
      !ORDERED_ITEM.test(rawLines[i]) &&
      !UNORDERED_ITEM.test(rawLines[i])
    ) {
      lines.push(rawLines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", lines });
  }

  return blocks;
}

// 連結、粗體、斜體都只支援一層,不處理巢狀(例如粗體裡面再斜體)——規則
// 欄位只是簡短說明文字,不需要完整 CommonMark。網址只接受 /開頭的站內
// 相對路徑,或 http(s):// 開頭的外部網址,其餘一律當純文字顯示,避免
// javascript: 之類的網址被當成連結執行。
const INLINE_PATTERN = /\[([^[\]]+)\]\(([^\s()]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }

    if (match[1] !== undefined) {
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
    } else if (match[3] !== undefined) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {match[3]}
        </strong>,
      );
    } else if (match[4] !== undefined) {
      parts.push(<em key={key++}>{match[4]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return parts;
}

/**
 * 規則欄位(site_rule_fields/world_rule_fields)內文用的簡易 Markdown 渲染
 * ——不是完整的單一世界觀內容,所以不支援 [[節點名稱]] WikiLink 語法(那
 * 需要指定要在哪個世界觀底下比對標題)。支援段落、- / 1. 清單、**粗體**、
 * *斜體*、[文字](網址) 連結;渲染出的是段落/清單這種區塊元素,呼叫端不要
 * 再包一層 <p>。
 */
export function MarkdownText({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <>
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <List key={i} ordered={block.ordered} items={block.items} />
        ) : (
          <Paragraph key={i} lines={block.lines} />
        ),
      )}
    </>
  );
}

function Paragraph({ lines }: { lines: string[] }) {
  return (
    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground first:mt-0">
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderInline(line)}
        </Fragment>
      ))}
    </p>
  );
}

function List({ ordered, items }: { ordered: boolean; items: string[] }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={`mt-2 first:mt-0 ${ordered ? "list-decimal" : "list-disc"} pl-5 text-sm text-muted-foreground`}
    >
      {items.map((item, i) => (
        <li key={i}>{renderInline(item)}</li>
      ))}
    </Tag>
  );
}
