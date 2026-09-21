import Link from "next/link";

/**
 * 中段快捷列——只剩快速參與按鈕,搜尋改到分頁裡的「搜尋」分頁
 * (WorldSearchTab)。跟後台版世界觀首頁共用同一份檔案:兩個「+新增」
 * 按鈕本來就都連去後台的建立頁面(建立一律在後台做,不管是從公開頁面
 * 還是後台頁面點進來都一樣)。公開版點了未登入會被 requireUser() 導去
 * /login,跟站上其他「公開頁面連去後台操作」的慣例一致,不在這裡重複
 * 判斷登入狀態。
 */
export function WorldQuickBar({ worldSlug }: { worldSlug: string }) {
  return (
    <section className="mt-6 flex flex-wrap justify-end gap-2 text-sm">
      <Link
        href={`/dashboard/worlds/${worldSlug}/nodes/new`}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 hover:bg-muted"
      >
        + 新增條目
      </Link>
      <Link
        href={`/dashboard/worlds/${worldSlug}/characters/new`}
        className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary-hover"
      >
        + 建立角色
      </Link>
    </section>
  );
}
