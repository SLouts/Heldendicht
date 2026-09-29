import Link from "next/link";

/**
 * 中段快捷列——只放快速參與按鈕,搜尋移到「設定百科」分頁裡的
 * NodeSearchBox。跟後台版世界觀首頁共用同一份檔案:兩個「+新增」按鈕
 * 本來就都連去後台的建立頁面(建立一律在後台做,不管是從公開頁面還是
 * 後台頁面點進來都一樣)。公開版點了未登入會被 requireUser() 導去
 * /login,跟站上其他「公開頁面連去後台操作」的慣例一致,不在這裡重複
 * 判斷登入狀態。手機寬度下兩顆按鈕改成等寬並排,確保觸控熱區。
 */
export function WorldQuickBar({ worldSlug }: { worldSlug: string }) {
  return (
    <section className="mt-6 grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:justify-end">
      <Link
        href={`/dashboard/worlds/${worldSlug}/nodes/new`}
        className="flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-3 py-1.5 text-center hover:bg-muted"
      >
        + 新增條目
      </Link>
      <Link
        href={`/dashboard/worlds/${worldSlug}/characters/new`}
        className="flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-center text-primary-foreground hover:bg-primary-hover"
      >
        + 建立角色
      </Link>
    </section>
  );
}
