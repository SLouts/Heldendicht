import { NODE_CATEGORIES, NODE_CATEGORY_LABELS, NODE_CATEGORY_COLOR_VARS } from "@/lib/nodeCategory";

/**
 * 關係圖節點的顏色圖例——顏色一律讀 NODE_CATEGORY_COLOR_VARS,跟
 * StoryMapGraph 畫節點圓點、WorldDirectoryTab/WorldMapView 畫分類小圓點
 * 用同一份對照表,不要自己另外寫一份顏色(之前這裡是寫死套用語意化
 * 色彩變數如 var(--primary)/var(--badge-info-fg),跟節點圓點的來源不是
 * 同一份,换主題後兩邊對不起來;也漏列了勢力/概念/事件/文章四類)。
 */
export function CategoryLegend() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
      {NODE_CATEGORIES.map((cat) => (
        <span key={cat} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: NODE_CATEGORY_COLOR_VARS[cat] }}
          />
          {NODE_CATEGORY_LABELS[cat]}
        </span>
      ))}
    </div>
  );
}
