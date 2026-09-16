"use client";

import { NODE_CATEGORIES, NODE_CATEGORY_LABELS, type NodeCategory } from "@/lib/nodeCategory";

/** 「只檢視特定屬性節點」的篩選列——地圖標點跟關係圖節點共用同一顆元件。 */
export function NodeCategoryFilter({
  visible,
  onToggle,
}: {
  visible: Set<NodeCategory>;
  onToggle: (category: NodeCategory) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-xs text-muted-foreground">篩選:</span>
      {NODE_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onToggle(cat)}
          className={
            "rounded-full border px-3 py-1 text-xs transition " +
            (visible.has(cat)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-muted-foreground hover:bg-muted")
          }
        >
          {NODE_CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
