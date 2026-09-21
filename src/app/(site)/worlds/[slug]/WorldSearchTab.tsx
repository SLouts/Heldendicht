import { NodeSearchBox } from "@/components/NodeSearchBox";

/**
 * 「搜尋」分頁——世界觀內條目搜尋(NodeSearchBox,原封不動沿用既有元件,
 * 純 ILIKE 查詢,沒有向量/外部 AI),本來是首頁中段一直顯示的快捷列,
 * 改成分頁裡的其中一個選項,不用一直佔位置。跟公開版/後台版世界觀首頁
 * 共用同一份檔案,差別只有搜尋結果連結的前綴(basePath)。
 */
export function WorldSearchTab({
  worldId,
  basePath,
}: {
  worldId: string;
  basePath: string;
}) {
  return <NodeSearchBox worldId={worldId} basePath={basePath} />;
}
