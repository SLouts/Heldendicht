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

/**
 * 月/日都是選填的補充精確度(見 migration 035)——空字串代表沒填,轉成
 * null;有填就驗證是不是落在合法範圍內的整數。不驗證月份實際天數上限
 * (例如 2 月 30 日),這是世界觀自己的曆法,不是地球西元曆。
 */
function optionalDatePart(min: number, max: number, label: string) {
  return z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), {
      error: `${label}請輸入 ${min}~${max} 的整數`,
    });
}

const CreateChapterSchema = z
  .object({
    worldId: z.uuid(),
    worldSlug: z.string().min(1),
    title: z.string().min(1, { error: "請輸入章節名稱" }),
    description: z.string(),
    yearStart: z.coerce.number().int({ error: "請輸入這個章節的起始年份" }),
    yearStartMonth: optionalDatePart(1, 12, "起始月份"),
    yearStartDay: optionalDatePart(1, 31, "起始日期"),
    yearEnd: z.string(),
    yearEndMonth: optionalDatePart(1, 12, "結束月份"),
    yearEndDay: optionalDatePart(1, 31, "結束日期"),
  })
  .transform((data) => ({
    ...data,
    yearEnd: data.yearEnd.trim() === "" ? null : Number(data.yearEnd),
  }))
  .refine((data) => data.yearEnd === null || Number.isInteger(data.yearEnd), {
    error: "結束年份請輸入整數",
    path: ["yearEnd"],
  })
  .refine((data) => data.yearEnd === null || data.yearEnd >= data.yearStart, {
    error: "結束年份不能早於起始年份",
    path: ["yearEnd"],
  })
  .refine((data) => data.yearStartDay === null || data.yearStartMonth !== null, {
    error: "請先填起始月份",
    path: ["yearStartDay"],
  })
  .refine((data) => data.yearEndMonth === null || data.yearEnd !== null, {
    error: "請先填結束年份",
    path: ["yearEndMonth"],
  })
  .refine((data) => data.yearEndDay === null || data.yearEndMonth !== null, {
    error: "請先填結束月份",
    path: ["yearEndDay"],
  });

/**
 * 建立「企劃時間軸」(scope='official')章節——角色自己的時間軸已經
 * 改回角色節點頁面的 character_timeline_events,這裡不再支援
 * scope='character'。只有世界觀 staff 能成功(story_chapters_write
 * policy 擋非 staff),這裡不重複判斷權限,交給資料庫。
 *
 * 章節改用「起始/結束年份(+選填的月/日)」決定在企劃時間軸上的位置,
 * 不再讓主辦手動輸入 order_index——那個欄位還在(unique index 還在),
 * 這裡自動算「目前這個世界觀官方章節裡最大的 order_index + 1」寫入,
 * 純粹滿足既有約束,排序顯示完全看 year_start(+月/日)。
 */
export async function createChapter(
  _prevState: StoryFormState,
  formData: FormData,
): Promise<StoryFormState> {
  const user = await requireUser();

  const parsed = CreateChapterSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    yearStart: formData.get("yearStart"),
    yearStartMonth: formData.get("yearStartMonth") ?? "",
    yearStartDay: formData.get("yearStartDay") ?? "",
    yearEnd: formData.get("yearEnd") ?? "",
    yearEndMonth: formData.get("yearEndMonth") ?? "",
    yearEndDay: formData.get("yearEndDay") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("story_chapters")
    .select("order_index")
    .eq("world_id", parsed.data.worldId)
    .eq("scope", "official")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const basePayload = {
    world_id: parsed.data.worldId,
    scope: "official" as const,
    title: parsed.data.title,
    description: parsed.data.description || null,
    order_index: (last?.order_index ?? 0) + 1,
    year_start: parsed.data.yearStart,
    year_end: parsed.data.yearEnd,
    creator_id: user.id,
  };

  // migration 035 套用前還沒有月/日這四欄,insert 會直接失敗——接住那個
  // 失敗,退回不含這四欄的 insert,讓建立章節在套用 migration 之前還能
  // 正常運作,只是沒辦法填到月/日的精確度。
  const withDate = await supabase
    .from("story_chapters")
    .insert({
      ...basePayload,
      year_start_month: parsed.data.yearStartMonth,
      year_start_day: parsed.data.yearStartDay,
      year_end_month: parsed.data.yearEndMonth,
      year_end_day: parsed.data.yearEndDay,
    })
    .select("id")
    .single();

  const { data, error } = withDate.error
    ? await supabase.from("story_chapters").insert(basePayload).select("id").single()
    : withDate;

  if (error) {
    return { error: "建立失敗,你可能沒有權限建立這條時間軸" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/story`);
  redirect(
    `/dashboard/worlds/${parsed.data.worldSlug}/story/chapters/${data.id}`,
  );
}

const UpdateChapterSchema = z
  .object({
    chapterId: z.uuid(),
    worldSlug: z.string().min(1),
    title: z.string().min(1, { error: "請輸入章節名稱" }),
    description: z.string(),
    yearStart: z.coerce.number().int({ error: "請輸入這個章節的起始年份" }),
    yearStartMonth: optionalDatePart(1, 12, "起始月份"),
    yearStartDay: optionalDatePart(1, 31, "起始日期"),
    yearEnd: z.string(),
    yearEndMonth: optionalDatePart(1, 12, "結束月份"),
    yearEndDay: optionalDatePart(1, 31, "結束日期"),
  })
  .transform((data) => ({
    ...data,
    yearEnd: data.yearEnd.trim() === "" ? null : Number(data.yearEnd),
  }))
  .refine((data) => data.yearEnd === null || Number.isInteger(data.yearEnd), {
    error: "結束年份請輸入整數",
    path: ["yearEnd"],
  })
  .refine((data) => data.yearEnd === null || data.yearEnd >= data.yearStart, {
    error: "結束年份不能早於起始年份",
    path: ["yearEnd"],
  })
  .refine((data) => data.yearStartDay === null || data.yearStartMonth !== null, {
    error: "請先填起始月份",
    path: ["yearStartDay"],
  })
  .refine((data) => data.yearEndMonth === null || data.yearEnd !== null, {
    error: "請先填結束年份",
    path: ["yearEndMonth"],
  })
  .refine((data) => data.yearEndDay === null || data.yearEndMonth !== null, {
    error: "請先填結束月份",
    path: ["yearEndDay"],
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
    yearStart: formData.get("yearStart"),
    yearStartMonth: formData.get("yearStartMonth") ?? "",
    yearStartDay: formData.get("yearStartDay") ?? "",
    yearEnd: formData.get("yearEnd") ?? "",
    yearEndMonth: formData.get("yearEndMonth") ?? "",
    yearEndDay: formData.get("yearEndDay") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const basePayload = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    year_start: parsed.data.yearStart,
    year_end: parsed.data.yearEnd,
  };

  const supabase = await createClient();

  // migration 035 套用前還沒有月/日這四欄,update 會直接失敗——接住那個
  // 失敗,退回不含這四欄的 update。
  const withDate = await supabase
    .from("story_chapters")
    .update(
      {
        ...basePayload,
        year_start_month: parsed.data.yearStartMonth,
        year_start_day: parsed.data.yearStartDay,
        year_end_month: parsed.data.yearEndMonth,
        year_end_day: parsed.data.yearEndDay,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.chapterId);

  const { error, count } = withDate.error
    ? await supabase
        .from("story_chapters")
        .update(basePayload, { count: "exact" })
        .eq("id", parsed.data.chapterId)
    : withDate;

  if (error) {
    return { error: "更新失敗,請稍後再試" };
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
 * 不用另外選。node_id 欄位保留給舊資料,新段落一律不會再設定它。
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

const UpdateStoryTimelineRangeSchema = z
  .object({
    worldId: z.uuid(),
    worldSlug: z.string().min(1),
    yearStart: z.string(),
    yearEnd: z.string(),
  })
  .transform((data) => ({
    worldId: data.worldId,
    worldSlug: data.worldSlug,
    yearStart: data.yearStart.trim() === "" ? null : Number(data.yearStart),
    yearEnd: data.yearEnd.trim() === "" ? null : Number(data.yearEnd),
  }))
  .refine((data) => data.yearStart === null || Number.isInteger(data.yearStart), {
    error: "起始年份請輸入整數",
    path: ["yearStart"],
  })
  .refine((data) => data.yearEnd === null || Number.isInteger(data.yearEnd), {
    error: "結束年份請輸入整數",
    path: ["yearEnd"],
  })
  .refine(
    (data) => data.yearStart === null || data.yearEnd === null || data.yearEnd >= data.yearStart,
    { error: "結束年份不能早於起始年份", path: ["yearEnd"] },
  );

/**
 * 設定「企劃時間軸」橫軸要呈現的起迄年份(worlds.story_timeline_year_start/
 * year_end)——跟每個章節各自的 year_start/year_end 是兩件事,這裡是軸線
 * 本身的顯示範圍,讓主辦可以呈現出正確的歷史尺度,不會被目前實際有的
 * 章節資料「擠」成一小段。只填其中一欄視同沒設定,兩欄一起清空,退回
 * 自動依資料範圍顯示(不支援開放式區間)。
 *
 * 只有世界觀 admin 能成功(worlds_update_admin policy 擋非 admin 的 staff),
 * 這裡不重複判斷權限,交給資料庫。
 */
export async function updateStoryTimelineRange(
  _prevState: StoryFormState,
  formData: FormData,
): Promise<StoryFormState> {
  await requireUser();

  const parsed = UpdateStoryTimelineRangeSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    yearStart: formData.get("yearStart") ?? "",
    yearEnd: formData.get("yearEnd") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const bothSet = parsed.data.yearStart !== null && parsed.data.yearEnd !== null;

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("worlds")
    .update(
      {
        story_timeline_year_start: bothSet ? parsed.data.yearStart : null,
        story_timeline_year_end: bothSet ? parsed.data.yearEnd : null,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.worldId);

  if (error) {
    return { error: "更新失敗,請稍後再試" };
  }
  if (count === 0) {
    return { error: "你沒有權限修改這個世界觀的時間軸設定" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/story`);
  revalidatePath(`/worlds/${parsed.data.worldSlug}/story`);
  return undefined;
}
