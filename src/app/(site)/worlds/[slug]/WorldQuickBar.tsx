import Link from "next/link";

/**
 * 中段快捷列——只放快速參與按鈕,搜尋移到「世界觀百科」分頁裡的
 * NodeSearchBox。跟後台版世界觀首頁共用同一份檔案:兩個「+新增」按鈕
 * 本來就都連去後台的建立頁面(建立一律在後台做,不管是從公開頁面還是
 * 後台頁面點進來都一樣)。公開版點了未登入會被 requireUser() 導去
 * /login,跟站上其他「公開頁面連去後台操作」的慣例一致,不在這裡重複
 * 判斷登入狀態擋連結本身;只是訪客點下去會被導去登入、看起來像沒反應,
 * 所以未登入時把文字改成「登入後新增」先說明清楚,連結目的地不變。
 * 手機寬度下兩顆按鈕改成等寬並排,確保觸控熱區。
 *
 * isLoggedIn 預設 true——後台版世界觀首頁本來就一定是登入狀態,呼叫端
 * 不用特地傳;只有公開版頁面會明確傳入目前訪客是不是真的登入。
 */
export function WorldQuickBar({
  worldSlug,
  isLoggedIn = true,
}: {
  worldSlug: string;
  isLoggedIn?: boolean;
}) {
  return (
    <section className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:justify-end">
      <Link
        href={`/dashboard/worlds/${worldSlug}/nodes/new`}
        className="flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-3 py-1.5 text-center hover:bg-muted"
      >
        {isLoggedIn ? "+ 新增條目" : "登入後新增條目"}
      </Link>
      <Link
        href={`/dashboard/worlds/${worldSlug}/characters/new`}
        className="flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-center text-primary-foreground hover:bg-primary-hover"
      >
        {isLoggedIn ? "+ 建立角色" : "登入後建立角色"}
      </Link>
    </section>
  );
}
