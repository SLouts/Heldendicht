"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type StoryFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const CreateChapterSchema = z
  .object({
    worldId: z.uuid(),
    worldSlug: z.string().min(1),
    scope: z.enum(["official", "character"]),
    characterId: z.string(), // "" 代表 official,character 模式下才需要是合法 uuid
    title: z.string().min(1, { error: "請輸入章節名稱" }),
    description: z.string(),
    orderIndex: z.coerce.number().int(),
  })
  .refine((data) => data.scope === "official" || z.uuid().safeParse(data.characterId).success, {
    error: "請選擇這條時間軸屬於哪個角色",
    path: ["characterId"],
  });

/**
 * 建立時間軸章節。scope='official' 只有世界觀 staff 能成功(story_chapters_write
 * policy 擋非 staff);scope='character' 只有這個角色的擁有者或 staff 能成功
 * (owns_character() 判斷)——這裡不重複判斷權限,交給資料庫。
 */
export async function createChapter(
  _prevState: StoryFormState,
  formData: FormData,
): Promise<StoryFormState> {
  const user = await requireUser();

  const parsed = CreateChapterSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    scope: formData.get("scope"),
    characterId: formData.get("characterId") ?? "",
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    orderIndex: formData.get("orderIndex") || 1,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_chapters")
    .insert({
      world_id: parsed.data.worldId,
      scope: parsed.data.scope,
      character_id: parsed.data.scope === "character" ? parsed.data.characterId : null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      order_index: parsed.data.orderIndex,
      creator_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "這個順序已經被用過了,換一個數字試試"
          : "建立失敗,你可能沒有權限建立這條時間軸",
    };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/story`);
  redirect(
    `/dashboard/worlds/${parsed.data.worldSlug}/story/chapters/${data.id}`,
  );
}

const UpdateChapterSchema = z.object({
  chapterId: z.uuid(),
  worldSlug: z.string().min(1),
  title: z.string().min(1, { error: "請輸入章節名稱" }),
  description: z.string(),
  orderIndex: z.coerce.number().int(),
});

export async function updateChapter(
  _prevState: StoryFormState,
  formData: FormData,
): Promise<StoryFormState> {
  await requireUser();

  const parsed = UpdateChapterSchema.safeParse({
    chapterId: formData.get("chapterId"),
    worldSlug: formData.get("worldSlug"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    orderIndex: formData.get("orderIndex") || 1,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("story_chapters")
    .update(
      {
        title: parsed.data.title,
        description: parsed.data.description || null,
        order_index: parsed.data.orderIndex,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.chapterId);

  if (error) {
    return {
      error: error.code === "23505" ? "這個順序已經被用過了" : "更新失敗,請稍後再試",
    };
  }
  if (count === 0) {
    return { error: "你沒有權限編輯這條時間軸" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/story/chapters/${parsed.data.chapterId}`);
  return undefined;
}

export async function deleteChapter(
  chapterId: string,
  worldSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("story_chapters")
    .delete({ count: "exact" })
    .eq("id", chapterId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限刪除這條時間軸");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/story`);
  redirect(`/dashboard/worlds/${worldSlug}/story`);
}

const CreateStepSchema = z.object({
  chapterId: z.uuid(),
  worldSlug: z.string().min(1),
  orderIndex: z.coerce.number().int(),
  customText: z.string(),
  povCharacterId: z.string(),
});

/**
 * 段落不再強制綁節點——以前這裡一定要求 nodeId 是合法 uuid,現在完全
 * 交給作者自己在 customText 裡用 [[節點名稱]] 或 [文字](網址) 連結,
 * 不用另外選。node_id 欄位保留給舊資料,新段落一律不設定它。
 */
export async function createStep(
  _prevState: StoryFormState,
  formData: FormData,
): Promise<StoryFormState> {
  await requireUser();

  const parsed = CreateStepSchema.safeParse({
    chapterId: formData.get("chapterId"),
    worldSlug: formData.get("worldSlug"),
    orderIndex: formData.get("orderIndex") || 1,
    customText: formData.get("customText") ?? "",
    povCharacterId: formData.get("povCharacterId") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("story_steps").insert({
    chapter_id: parsed.data.chapterId,
    order_index: parsed.data.orderIndex,
    custom_text: parsed.data.customText || null,
    pov_character_id: parsed.data.povCharacterId || null,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "這個順序已經被用過了,換一個數字試試"
          : "建立失敗,你可能沒有權限編輯這條時間軸",
    };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/story/chapters/${parsed.data.chapterId}`);
  redirect(
    `/dashboard/worlds/${parsed.data.worldSlug}/story/chapters/${parsed.data.chapterId}`,
  );
}

const UpdateStepSchema = z.object({
  stepId: z.uuid(),
  chapterId: z.uuid(),
  worldSlug: z.string().min(1),
  orderIndex: z.coerce.number().int(),
  customText: z.string(),
  povCharacterId: z.string(),
});

export async function updateStep(
  _prevState: StoryFormState,
  formData: FormData,
): Promise<StoryFormState> {
  await requireUser();

  const parsed = UpdateStepSchema.safeParse({
    stepId: formData.get("stepId"),
    chapterId: formData.get("chapterId"),
    worldSlug: formData.get("worldSlug"),
    orderIndex: formData.get("orderIndex") || 1,
    customText: formData.get("customText") ?? "",
    povCharacterId: formData.get("povCharacterId") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("story_steps")
    .update(
      {
        order_index: parsed.data.orderIndex,
        custom_text: parsed.data.customText || null,
        pov_character_id: parsed.data.povCharacterId || null,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.stepId);

  if (error) {
    return {
      error: error.code === "23505" ? "這個順序已經被用過了" : "更新失敗,請稍後再試",
    };
  }
  if (count === 0) {
    return { error: "你沒有權限編輯這段內容" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/story/chapters/${parsed.data.chapterId}`);
  return undefined;
}

export async function deleteStep(
  stepId: string,
  chapterId: string,
  worldSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("story_steps")
    .delete({ count: "exact" })
    .eq("id", stepId);

  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限刪除這段內容");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}/story/chapters/${chapterId}`);
}
