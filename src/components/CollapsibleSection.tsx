/**
 * 首頁的分類/類型清單改成下拉收合式,列表一長就不會把整頁撐得很長。
 * 純用原生 <details>/<summary>,不需要 client component。
 */
export function CollapsibleSection({
  title,
  count,
  badge,
  description,
  children,
}: {
  title: string;
  count?: number;
  badge?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-muted-foreground transition-transform group-open:rotate-90">
          ▶
        </span>
        <span className="font-semibold">{title}</span>
        {typeof count === "number" && (
          <span className="text-sm text-muted-foreground">({count})</span>
        )}
        {badge}
      </summary>
      <div className="border-t border-border p-4 pt-3">
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {children}
      </div>
    </details>
  );
}
