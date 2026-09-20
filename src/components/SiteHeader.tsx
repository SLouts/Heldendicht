import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";

/**
 * 對外頁面共用的橫幅頁首——「Heldendicht」字標+右側導覽,原本寫死在
 * 首頁 page.tsx 裡,現在抽出來讓 (site) route group 底下所有對外頁面
 * (首頁、世界觀瀏覽/節點頁、登入/註冊/忘記密碼/重設密碼、玩家個人頁)
 * 共用一份。後台(/dashboard)有自己專屬的頁首(含通知/私訊/登出),
 * 不套用這份,避免疊出兩條頁首。
 *
 * 依登入狀態切換右側連結:未登入顯示登入/註冊,已登入顯示前往後台
 * (後台頁首已經有登出功能,這裡不重複做一個)。
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl font-semibold tracking-wide">
          Heldendicht
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/worlds" className="hover:underline">
            探索公開世界觀
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground transition hover:bg-primary-hover"
            >
              前往後台
            </Link>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                登入
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground transition hover:bg-primary-hover"
              >
                註冊
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
