"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

const CreateCharacterSchema = z.object({
  worldId: z.uuid(),
  worldSlug: z.string().min(1),
  title: z.string().min(1, { error: "請輸入角色名稱" }),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, { error: "slug 只能用小寫英數字與連字號" }),
  content: z.string(),
  characterType: z.enum(["pc", "npc"]),
});

export type CreateCharacterState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

/**
 * 範例:建立 PC/NPC 一律呼叫 create_character RPC(見 database/schema.sql),
 * 而不是分兩次呼叫 `.from("nodes").insert()` 再 `.from("characters").insert()`
 * —— 這樣配額 trigger 擋下時,不會留下沒有配對 characters 的孤兒節點。
 *
 * 這裡完全沒有自己判斷「是否超過配額」或「是否為世界觀成員」,
 * 這些全部交給資料庫的 RLS policy 與 enforce_pc_quota trigger 把關;
 * Server Action 只負責基本的表單格式驗證與呼叫 RPC,
 * 配額被擋下時直接把資料庫丟出的中文錯誤訊息顯示給使用者。
 */
export async function createCharacter(
  _prevState: CreateCharacterState,
  formData: FormData,
): Promise<CreateCharacterState> {
  const user = await requireUser();

  const parsed = CreateCharacterSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    content: formData.get("content") ?? "",
    characterType: formData.get("characterType"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { worldId, worldSlug, title, slug, content, characterType } =
    parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_character", {
    p_world_id: worldId,
    p_title: title,
    p_slug: slug,
    p_content: content,
    p_character_type: characterType,
    p_owner_id: characterType === "pc" ? user.id : null,
  });

  if (error) {
    // 配額 / 權限被資料庫擋下時,error.message 就是 trigger 丟出的那句中文提示
    return { error: error.message };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  redirect(`/dashboard/worlds/${worldSlug}/nodes/${slug}`);
}
