import Link from "next/link";
import { NodeSearchBox } from "@/components/NodeSearchBox";

/**
 * 中段快捷列——世界觀內條目搜尋(NodeSearchBox,原封不動沿用既有元件,
 * 純 ILIKE 查詢,沒有向量/外部 AI)+快速參與按鈕。跟後台版世界觀首頁
 * 共用同一份檔案:兩個「+新增」按鈕本來就都連去後台的建立頁面(建立
 * 一律在後台做,不管是從公開頁面還是後台頁面點進來都一樣),差別只有
 * 搜尋結果連結的前綴(searchBasePath)。公開版點了未登入會被
 * requireUser() 導去 /login,跟站上其他「公開頁面連去後台操作」的慣例
 * 一致,不在這裡重複判斷登入狀態。
 */
export function WorldQuickBar({
  worldId,
  worldSlug,
  searchBasePath,
}: {
  worldId: string;
  worldSlug: string;
  searchBasePath: string;
}) {
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">搜尋這個世界觀</h2>
        <div className="flex flex-wrap gap-2 text-sm">
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
        </div>
      </div>
      <NodeSearchBox worldId={worldId} basePath={searchBasePath} />
    </section>
  );
}
