/**
 * 世界地圖標點跟關係圖節點共用的「屬性分類」——用來決定顏色,也用來做
 * 節點篩選(只檢視特定屬性的節點)。兩邊原本各自維護一份幾乎一樣的
 * `nodeType`/`characterType`/`isPlaceholder` 判斷邏輯,抽成這裡共用一份。
 */
export type NodeCategory = "location" | "item" | "pc" | "npc" | "placeholder";

export type CategorizableNode = {
  nodeType: string;
  isPlaceholder: boolean;
  characterType: "pc" | "npc" | null;
};

export function nodeCategory(n: CategorizableNode): NodeCategory {
  if (n.isPlaceholder) return "placeholder";
  if (n.nodeType === "location") return "location";
  if (n.nodeType === "item") return "item";
  if (n.nodeType === "character") return n.characterType === "pc" ? "pc" : "npc";
  return "placeholder";
}

export const NODE_CATEGORIES: NodeCategory[] = ["location", "item", "pc", "npc", "placeholder"];

export const NODE_CATEGORY_LABELS: Record<NodeCategory, string> = {
  location: "地點",
  item: "物產",
  pc: "PC",
  npc: "NPC",
  placeholder: "待撰寫",
};

export const NODE_CATEGORY_COLOR_VARS: Record<NodeCategory, string> = {
  location: "var(--success)",
  item: "var(--primary)",
  pc: "var(--badge-info-fg)",
  npc: "var(--muted-foreground)",
  placeholder: "var(--muted-foreground)",
};
