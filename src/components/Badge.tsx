const VARIANT_CLASS = {
  pending: "bg-badge-pending-bg text-badge-pending-fg",
  danger: "bg-badge-danger-bg text-badge-danger-fg",
  success: "bg-badge-success-bg text-badge-success-fg",
  info: "bg-badge-info-bg text-badge-info-fg",
  neutral: "bg-badge-neutral-bg text-badge-neutral-fg",
} as const;

export type BadgeVariant = keyof typeof VARIANT_CLASS;

/**
 * 語意化標籤——五種色調(pending/danger/success/info/neutral)都只綁
 * bg-badge-*-bg/text-badge-*-fg 這組 token,不寫死色碼,六套主題各自的
 * 徽章配色由 globals.css 決定。
 */
export function Badge({
  variant = "neutral",
  children,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </span>
  );
}
