/**
 * 世界地圖標點跟關係圖節點共用的「屬性分類」——用來決定顏色,也用來做
 * 節點篩選(只檢視特定屬性的節點)。兩邊原本各自維護一份幾乎一樣的
 * `nodeType`/`characterType`/`isPlaceholder` 判斷邏輯,抽成這裡共用一份。
 *
 * 這裡的「分類」是指節點的固定屬性(地點/物產/PC/NPC/...),跟世界觀
 * 主辦可以自訂的「內容分類」(world_content_categories,用在首頁導覽跟
 * 投稿權限)是兩件不同的事,不要搞混。
 */
export type NodeCategory =
  | "location"
  | "item"
  | "pc"
  | "npc"
  | "faction"
  | "concept"
  | "event"
  | "article"
  | "placeholder";

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
  if (n.nodeType === "faction") return "faction";
  if (n.nodeType === "concept") return "concept";
  if (n.nodeType === "event") return "event";
  if (n.nodeType === "article") return "article";
  return "placeholder";
}

export const NODE_CATEGORIES: NodeCategory[] = [
  "location",
  "item",
  "pc",
  "npc",
  "faction",
  "concept",
  "event",
  "article",
  "placeholder",
];

export const NODE_CATEGORY_LABELS: Record<NodeCategory, string> = {
  location: "地點",
  item: "物產",
  pc: "PC",
  npc: "NPC",
  faction: "勢力",
  concept: "概念",
  event: "事件",
  article: "文章",
  placeholder: "待撰寫",
};

export const NODE_CATEGORY_COLOR_VARS: Record<NodeCategory, string> = {
  location: "var(--success)",
  item: "var(--primary)",
  pc: "var(--badge-info-fg)",
  npc: "var(--muted-foreground)",
  faction: "var(--danger)",
  concept: "var(--badge-pending-fg)",
  event: "var(--badge-neutral-fg)",
  article: "var(--foreground)",
  placeholder: "var(--muted-foreground)",
};
