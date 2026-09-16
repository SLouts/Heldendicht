import type { NodeType } from "@/lib/supabase/database.types";

/** 節點頁面上顯示用的中文標籤,跟 nodes.node_type 這個 DB enum 一一對應。 */
export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  location: "地點",
  item: "物產",
  character: "角色",
  faction: "勢力",
  concept: "概念",
  event: "事件",
  article: "文章",
  unspecified: "尚未分類(待撰寫)",
};
