import type { NodeType, NodeStatus } from "@/lib/supabase/database.types";

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

/**
 * 節點審核狀態的中文標籤,跟 nodes.status 這個 DB enum 一一對應——approved
 * 是預設/正常狀態,通常不需要額外標示,呼叫端自行決定要不要顯示
 * approved 這個 key(例如只在 status !== 'approved' 時才顯示 badge)。
 */
export const NODE_STATUS_LABEL: Record<NodeStatus, string> = {
  pending: "未正式過審",
  approved: "已過審",
  rejected: "已駁回",
};

/**
 * 首頁「未分類」區塊照類型分開展示時的順序——不含 character(角色有自己
 * 獨立的區塊,不跟地點/物產混在一起分組)。
 */
export const FALLBACK_NODE_TYPE_ORDER: NodeType[] = [
  "location",
  "item",
  "faction",
  "concept",
  "event",
  "article",
  "unspecified",
];
