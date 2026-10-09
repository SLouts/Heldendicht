import Link from "next/link";

/**
 * 全站共用的 404 頁——取代 Next.js 預設的英文版(This page could not be
 * found),風格跟首頁一致,補上「回首頁」的連結。掛在 app 根目錄,
 * (site)/dashboard 底下找不到路由時都會落到這裡。
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24 text-center">
      <h1 className="font-display text-4xl font-bold tracking-tight">找不到這個頁面</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        這個網址可能已經移除、改了位置,或是從來就不存在。
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
        >
          回首頁
        </Link>
        <Link
          href="/worlds"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-surface"
        >
          探索公開世界觀
        </Link>
      </div>
    </div>
  );
}
