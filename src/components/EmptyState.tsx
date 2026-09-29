import Link from "next/link";
import type { ReactNode } from "react";

function DefaultIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5V6a2 2 0 0 1 2-2h8l6 6v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path d="M14 4v5a1 1 0 0 0 1 1h5" />
      <path d="M9 15h6M9 11.5h3" />
    </svg>
  );
}

/**
 * 置中的空狀態卡片——圖示+說明文字+選填的引導動作(給有編輯權限的人)。
 * 顏色只用 border-border/bg-surface/text-muted-foreground,是全站第一個
 * 共用的空狀態元件(之前都是各分頁自己寫一行 muted-foreground 文字)。
 */
export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
      <span className="text-muted-foreground">{icon ?? <DefaultIcon />}</span>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-2 inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 text-sm text-primary-foreground transition hover:bg-primary-hover"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
