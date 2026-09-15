/**
 * 世界觀頁面的導覽選單——原本是一排並排的按鈕,手機版容易擠成好幾行、
 * 看起來像「一堆按鍵」。改成單一個「選單」按鈕收合起來,點開才展開成
 * 下拉清單,純 HTML `<details>`/`<summary>`,不需要額外的 client-side
 * JS 就能運作(可鍵盤操作、可累積無障礙屬性)。
 */
export function NavMenu({
  label = "選單",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group relative w-fit">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm select-none [&::-webkit-details-marker]:hidden">
        {label}
        <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="absolute left-0 z-20 mt-1 flex w-52 flex-col gap-0.5 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
        {children}
      </div>
    </details>
  );
}
