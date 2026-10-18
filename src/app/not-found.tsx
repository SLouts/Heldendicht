import type { Metadata } from "next";
import Link from "next/link";
import { AssertDocumentTitle } from "./AssertDocumentTitle";

export const metadata: Metadata = {
  title: "找不到頁面",
};

/**
 * 全站共用的 404 頁——取代 Next.js 預設的英文版(This page could not be
 * found),風格跟首頁一致,補上「回首頁」跟「探索世界觀」的連結。掛在
 * app 根目錄,(site)/dashboard 底下找不到路由時都會落到這裡。
 *
 * 某些頁面(例如節點頁)是在非同步查完資料後才呼叫 notFound(),這種情況
 * Next.js 會先吐出一個佔位 HTML 殼,接著整個丟棄、改用純 client-side
 * render 接手——這次重新渲染沒辦法呼叫任何 generateMetadata(那是只能在
 * 伺服器端跑的 async 函式),分頁標題就會掉回 RootLayout 的預設值
 * 「Heldendicht」,即使伺服器當初吐出的 HTML 裡 <title> 其實是對的。
 * AssertDocumentTitle 用跟修 data-art-theme 同樣的手法:掛載後用
 * document.title 直接補設一次,不管前面發生什麼都保證最後是對的。
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24 text-center">
      <AssertDocumentTitle title="找不到頁面 ｜ Heldendicht" />
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
