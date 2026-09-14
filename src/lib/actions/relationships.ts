"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type RelationshipFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const CreateRelationshipSchema = z
  .object({
    worldId: z.uuid(),
    worldSlug: z.string().min(1),
    nodeAId: z.uuid({ error: "請選擇 A 端節點" }),
    nodeBId: z.uuid({ error: "請選擇 B 端節點" }),
    label: z.string(),
    labelReverse: z.string(),
    description: z.string(),
  })
  .refine((data) => data.nodeAId !== data.nodeBId, {
    error: "A、B 兩端不能是同一個節點",
    path: ["nodeBId"],
  });

/**
 * 建立人際關係線。免審核,建立後立即生效(status 預設 'active'),
 * 對照 relationships_insert policy:建立者必須是這個世界觀的成員,
 * 且 A、B 兩端節點都必須屬於同一個世界觀 —— 這裡不重複檢查,
 * 交給資料庫的 RLS + check constraint 把關。
 */
export async function createRelationship(
  _prevState: RelationshipFormState,
  formData: FormData,
): Promise<RelationshipFormState> {
  const user = await requireUser();

  const parsed = CreateRelationshipSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    nodeAId: formData.get("nodeAId"),
    nodeBId: formData.get("nodeBId"),
    label: formData.get("label") ?? "",
    labelReverse: formData.get("labelReverse") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("relationships")
    .insert({
      world_id: parsed.data.worldId,
      node_a_id: parsed.data.nodeAId,
      node_b_id: parsed.data.nodeBId,
      label: parsed.data.label || null,
      label_reverse: parsed.data.labelReverse || null,
      description: parsed.data.description || null,
      creator_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "建立失敗,可能你還不是這個世界觀的成員" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}`);
  redirect(`/dashboard/worlds/${parsed.data.worldSlug}/relationships/${data.id}`);
}

const UpdateRelationshipSchema = z.object({
  relationshipId: z.uuid(),
  worldSlug: z.string().min(1),
  label: z.string(),
  labelReverse: z.string(),
  description: z.string(),
});

/**
 * 編輯關係線的標籤/描述。建立者本人或世界觀 staff 才能改
 * —— 由 relationships_update policy 把關,這裡只讀受影響筆數判斷是否成功。
 */
export async function updateRelationship(
  _prevState: RelationshipFormState,
  formData: FormData,
): Promise<RelationshipFormState> {
  await requireUser();

  const parsed = UpdateRelationshipSchema.safeParse({
    relationshipId: formData.get("relationshipId"),
    worldSlug: formData.get("worldSlug"),
    label: formData.get("label") ?? "",
    labelReverse: formData.get("labelReverse") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("relationships")
    .update(
      {
        label: parsed.data.label || null,
        label_reverse: parsed.data.labelReverse || null,
        description: parsed.data.description || null,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.relationshipId);

  if (error) {
    return { error: "更新失敗,請稍後再試" };
  }
  if (count === 0) {
    return { error: "你沒有權限編輯這條關係線" };
  }

  revalidatePath(
    `/dashboard/worlds/${parsed.data.worldSlug}/relationships/${parsed.data.relationshipId}`,
  );
  return undefined;
}

/**
 * 撤銷關係線(不是刪除):status 改成 revoked,記錄是誰、何時撤銷的。
 * 對應「主辦可事後檢舉、撤銷或強制斷線」——這裡建立者本人也能撤銷自己拉的線,
 * 世界觀 staff 則對任何關係線都能撤銷。
 */
export async function revokeRelationship(
  relationshipId: string,
  worldSlug: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("relationships")
    .update(
      {
        status: "revoked",
        revoked_by: user.id,
        revoked_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", relationshipId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限撤銷這條關係線");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/relationships/${relationshipId}`);
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
}

/**
 * 強制刪除關係線。只有世界觀 staff/site_admin 能做
 * —— relationships_delete policy 沒有開放給一般建立者。
 */
export async function deleteRelationship(
  relationshipId: string,
  worldSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("relationships")
    .delete({ count: "exact" })
    .eq("id", relationshipId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限刪除這條關係線");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  redirect(`/dashboard/worlds/${worldSlug}`);
}
