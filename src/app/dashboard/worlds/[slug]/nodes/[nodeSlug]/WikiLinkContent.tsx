import Link from "next/link";
import { Fragment } from "react";

export function WikiLinkContent({
  content,
  worldSlug,
  links,
  images,
}: {
  content: string;
  worldSlug: string;
  links: Map<string, { slug: string; isPlaceholder: boolean }>;
  images: Map<string, { url: string; fileName: string }>;
}) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // 每次呼叫都建立新的 regex 實例,避免共用同一個物件的 lastIndex 狀態。
  // 兩種語法刻意用不相交的 pattern(WikiLink 用 [[..]],圖片嵌入用 {{image:..}}),
  // 圖片嵌入完全是前端渲染層的擴充,不會影響 sync_node_wikilinks trigger 的解析。
  const pattern = /\[\[([^[\]]+)\]\]|\{\{image:([0-9a-fA-F-]+)\}\}/g;
  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={key++}>{content.slice(lastIndex, match.index)}</Fragment>,
      );
    }

    if (match[1] !== undefined) {
      const name = match[1].trim();
      const target = links.get(name);
      if (target) {
        parts.push(
          <Link
            key={key++}
            href={`/dashboard/worlds/${worldSlug}/nodes/${target.slug}`}
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
        // 理論上不該發生(trigger 一定會建立對應的 wikilinks 列),防禦性 fallback。
        parts.push(<Fragment key={key++}>[[{name}]]</Fragment>);
      }
    } else {
      const imageId = match[2];
      const image = images.get(imageId);
      if (image) {
        parts.push(
          // eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域
          <img
            key={key++}
            src={image.url}
            alt={image.fileName}
            className="my-2 block max-h-96 max-w-full rounded-lg border border-border"
          />,
        );
      } else {
        // 附件已經被刪除,或這個嵌入語法根本無效 —— 原樣顯示,不讓內文憑空消失一段。
        parts.push(<Fragment key={key++}>{match[0]}</Fragment>);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(<Fragment key={key++}>{content.slice(lastIndex)}</Fragment>);
  }

  return <p className="whitespace-pre-wrap text-sm">{parts}</p>;
}
