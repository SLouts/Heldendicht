"use server";

import { createClient } from "@/lib/supabase/server";
import type { NodeType } from "@/lib/supabase/database.types";

export type NodeSearchResult = {
  id: string;
  title: string;
  slug: string;
  nodeType: NodeType;
  snippet: string;
  updatedAt: string;
};

const SNIPPET_RADIUS = 60;
const RESULT_LIMIT = 30;

/** content 裡截一段包含關鍵字的片段,前後各留 60 字當上下文;沒對到 content(只對到標題)時,回退成 content 開頭的一段純預覽。 */
function buildSnippet(content: string | null, query: string): string {
  const text = content ?? "";
  if (!text) return "";

  const trimmedQuery = query.trim();
  const matchIndex = trimmedQuery
    ? text.toLowerCase().indexOf(trimmedQuery.toLowerCase())
    : -1;

  if (matchIndex === -1) {
    return text.length > SNIPPET_RADIUS * 2
      ? `${text.slice(0, SNIPPET_RADIUS * 2)}…`
      : text;
  }

  const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  const end = Math.min(text.length, matchIndex + trimmedQuery.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

/**
 * 世界觀內條目搜尋——完全在 Supabase/Postgres 內用 ILIKE 模糊比對完成,
 * 不呼叫任何第三方 AI / Embedding API,也不使用 pgvector 語意檢索,避免
 * 使用者資料被送到外部服務。權限完全交給 nodes_select_visible 這條 RLS
 * policy(透過一般的、per-request 的 RLS-gated client 查詢),訪客跟登入
 * 使用者看到的結果差異只來自 RLS 本身,這裡不再額外過濾一次。
 */
export async function searchWorldNodes(
  worldId: string,
  query: string,
  nodeType: NodeType | "all",
): Promise<NodeSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery && nodeType === "all") {
    return [];
  }

  const supabase = await createClient();

  let request = supabase
    .from("nodes")
    .select("id, title, slug, node_type, content, updated_at")
    .eq("world_id", worldId)
    .eq("is_placeholder", false)
    .order("updated_at", { ascending: false })
    .limit(RESULT_LIMIT);

  if (trimmedQuery) {
    // 跳脫 ILIKE 萬用字元,避免使用者輸入的 % _ \ 被當成 pattern 語法。
    const escaped = trimmedQuery.replace(/[%_\\]/g, (m) => `\\${m}`);
    request = request.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }

  if (nodeType !== "all") {
    request = request.eq("node_type", nodeType);
  }

  const { data, error } = await request;
  if (error || !data) return [];

  return data.map((node) => ({
    id: node.id,
    title: node.title,
    slug: node.slug,
    nodeType: node.node_type,
    snippet: buildSnippet(node.content, trimmedQuery),
    updatedAt: node.updated_at,
  }));
}
