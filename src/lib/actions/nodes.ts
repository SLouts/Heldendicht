"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { generateNodeSlug } from "@/lib/slug";

export type NodeFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const CreateNodeSchema = z.object({
  worldId: z.uuid(),
  worldSlug: z.string().min(1),
  nodeType: z.enum(["location", "item", "faction", "concept", "event", "article"]),
  title: z.string().min(1, { error: "請輸入標題" }),
  content: z.string(),
  editMode: z.enum(["owner_only", "collaborative"]),
  // 選填,世界觀自訂的內容分類——分類是否開放投稿由 guard_node_category
  // trigger 把關,這裡不重複判斷。
  categoryId: z.union([z.uuid(), z.literal("")]).optional(),
});

const MAX_SLUG_ATTEMPTS = 5;

/**
 * 建立地點/物產節點(角色正史走 characters.ts 的 create_character RPC,不走這裡)。
 * 建立者必須是該世界觀成員,狀態一律從 pending 開始 —— 這兩點都由
 * nodes_insert_member 這條 RLS policy 保證,這裡不重複檢查。
 *
 * slug 不讓使用者自己填(標題常常是中文,硬要想一個英數字網址代號體驗很差),
 * 改成自動產生(見 lib/slug.ts),撞號時重試幾次即可——世界觀內節點量
 * 不大,撞號機率極低。
 */
export async function createNode(
  _prevState: NodeFormState,
  formData: FormData,
): Promise<NodeFormState> {
  const user = await requireUser();

  const parsed = CreateNodeSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    nodeType: formData.get("nodeType"),
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    editMode: formData.get("editMode"),
    categoryId: formData.get("categoryId") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  let data: { slug: string } | null = null;
  let error: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const result = await supabase
      .from("nodes")
      .insert({
        world_id: parsed.data.worldId,
        node_type: parsed.data.nodeType,
        title: parsed.data.title,
        slug: generateNodeSlug(parsed.data.title),
        content: parsed.data.content,
        edit_mode: parsed.data.editMode,
        creator_id: user.id,
        category_id: parsed.data.categoryId || null,
      })
      .select("slug")
      .single();
    data = result.data;
    error = result.error;
    if (!error || error.code !== "23505") break;
  }

  if (error) {
    return {
      error: error.message.includes("這個分類目前不開放投稿")
        ? error.message
        : error.code === "23505"
          ? "建立失敗,請稍後再試"
          : "建立失敗,可能是你還不是這個世界觀的成員",
    };
  }
  if (!data) {
    return { error: "建立失敗,請稍後再試" };
  }

  redirect(`/dashboard/worlds/${parsed.data.worldSlug}/nodes/${data.slug}`);
}

const UpdateNodeContentSchema = z.object({
  nodeId: z.uuid(),
  worldSlug: z.string().min(1),
  nodeSlug: z.string().min(1),
  title: z.string().min(1, { error: "請輸入標題" }),
  content: z.string(),
  // 只有「補完」WikiLink 自動建立的待撰寫節點時才會帶這個欄位,
  // 一般節點編輯表單沒有這個欄位,formData.get() 會是 null。
  nodeType: z.enum(["location", "item", "faction", "concept", "event", "article"]).optional(),
  // 選填,世界觀自訂的內容分類;空字串表示「移回未分類」。
  categoryId: z.union([z.uuid(), z.literal("")]).optional(),
});

/**
 * 編輯節點內文。是否有權限編輯(owner_only 只有本人、collaborative 開放成員、
 * staff 永遠可以)完全交給 nodes_update policy 判斷;每次修改內容,
 * DB 的 snapshot_node_revision trigger 會自動把「修改前」存進 node_revisions,
 * sync_node_wikilinks trigger 會自動重新解析內文裡的 [[名稱]]。
 *
 * 如果帶了 nodeType(「補完」WikiLink 自動建立的紅字佔位節點時才會有),
 * 一併把 node_type 從 'unspecified' 改成使用者選的分類,並清掉 is_placeholder。
 */
export async function updateNodeContent(
  _prevState: NodeFormState,
  formData: FormData,
): Promise<NodeFormState> {
  await requireUser();

  const parsed = UpdateNodeContentSchema.safeParse({
    nodeId: formData.get("nodeId"),
    worldSlug: formData.get("worldSlug"),
    nodeSlug: formData.get("nodeSlug"),
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    nodeType: formData.get("nodeType") || undefined,
    // 表單沒有帶這個欄位就代表「不改分類」;帶了空字串代表「移回未分類」。
    categoryId: formData.has("categoryId") ? formData.get("categoryId") ?? "" : undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("nodes")
    .update(
      {
        title: parsed.data.title,
        content: parsed.data.content,
        ...(parsed.data.nodeType && {
          node_type: parsed.data.nodeType,
          is_placeholder: false,
        }),
        ...(parsed.data.categoryId !== undefined && {
          category_id: parsed.data.categoryId || null,
        }),
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.nodeId);

  if (error) {
    return {
      error: error.message.includes("這個分類目前不開放投稿")
        ? error.message
        : "更新失敗,請稍後再試",
    };
  }
  if (count === 0) {
    return { error: "你沒有權限編輯這個節點" };
  }

  revalidatePath(
    `/dashboard/worlds/${parsed.data.worldSlug}/nodes/${parsed.data.nodeSlug}`,
  );
  return undefined;
}

/**
 * 審核節點(核准/駁回/打回審核中)。只有世界觀 staff(admin/editor)或
 * site_admin 能改 status/reviewed_by/reviewed_at/review_note —— 這是
 * guard_node_review_fields trigger 強制保證的,不是靠這裡的程式碼把關。
 * "pending" 這個決定是給已經 approved 的節點「打回審核中」用的(例如角色
 * 設定跟世界觀衝突,需要重新審一次),不是原本建立時的預設值。
 * reviewNote 選填,寫給建立者看的審核意見。
 */
export async function reviewNode(
  nodeId: string,
  worldSlug: string,
  nodeSlug: string,
  decision: "approved" | "rejected" | "pending",
  reviewNote?: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("nodes")
    .update(
      {
        status: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote?.trim() || null,
      },
      { count: "exact" },
    )
    .eq("id", nodeId);

  // 這兩個 action 是直接綁在按鈕上的(沒有走 useActionState 顯示錯誤訊息),
  // 頁面已經先用 isStaff/canDelete 擋過一次 UI,這裡失敗就直接丟例外即可。
  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限審核這個節點");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/nodes/${nodeSlug}`);
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
}

/**
 * 刪除節點。一般人只能刪自己還在 pending 的節點(撤回);staff/editor
 * 只有在「這個節點的建立者自己也是 staff」時才能強制刪除,一般 member
 * 建立的節點 staff 不能直接刪(只能審核駁回)——見 nodes_delete policy。
 * site_admin 任何狀態、任何建立者都能強制刪除。
 */
export async function deleteNode(
  nodeId: string,
  worldSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("nodes")
    .delete({ count: "exact" })
    .eq("id", nodeId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限刪除這個節點");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  redirect(`/dashboard/worlds/${worldSlug}`);
}
