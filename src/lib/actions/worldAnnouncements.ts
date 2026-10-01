"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type AnnouncementFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const TitleSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入標題" })
  .max(100, { error: "標題最多 100 字" });

const ContentSchema = z
  .string()
  .trim()
  .min(1, { error: "請輸入公告內容" })
  .max(8000, { error: "公告內容最多 8000 字" });

/**
 * 世界觀公告——多人共筆世界觀的主辦/編輯可以發布的短文(標題+內容),
 * 顯示在世界觀首頁「世界導讀」分頁、介紹文字下面,像部落格文章一樣
 * 照時間新到舊排序。「只有 staff 能發布/修改/刪除」交給
 * world_announcements 的 RLS policy 把關,這裡不重複檢查;author_id
 * 一定要是自己,同樣交給 insert policy 的 with check 擋,這裡只是
 * 單純把目前使用者的 id 填進去。
 */
export async function createWorldAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const user = await requireUser();

  const worldId = formData.get("worldId");
  const worldSlug = formData.get("worldSlug");
  if (typeof worldId !== "string" || typeof worldSlug !== "string") {
    return { error: "缺少必要欄位" };
  }

  const title = TitleSchema.safeParse(formData.get("title") ?? "");
  const content = ContentSchema.safeParse(formData.get("content") ?? "");
  if (!title.success || !content.success) {
    return {
      fieldErrors: {
        ...(title.success ? {} : { title: [title.error.issues[0].message] }),
        ...(content.success ? {} : { content: [content.error.issues[0].message] }),
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("world_announcements").insert({
    world_id: worldId,
    author_id: user.id,
    title: title.data,
    content: content.data,
  });
  if (error) {
    return { error: "發布失敗,請確認你是這個世界觀的主辦或編輯" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}`);
  return undefined;
}

export async function updateWorldAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  await requireUser();

  const announcementId = formData.get("announcementId");
  const worldSlug = formData.get("worldSlug");
  if (typeof announcementId !== "string" || typeof worldSlug !== "string") {
    return { error: "缺少必要欄位" };
  }

  const title = TitleSchema.safeParse(formData.get("title") ?? "");
  const content = ContentSchema.safeParse(formData.get("content") ?? "");
  if (!title.success || !content.success) {
    return {
      fieldErrors: {
        ...(title.success ? {} : { title: [title.error.issues[0].message] }),
        ...(content.success ? {} : { content: [content.error.issues[0].message] }),
      },
    };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("world_announcements")
    .update(
      { title: title.data, content: content.data, updated_at: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", announcementId);
  if (error || count === 0) {
    return { error: "更新失敗,請確認你是這個世界觀的主辦或編輯" };
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}`);
  return undefined;
}

export async function deleteWorldAnnouncement(
  worldSlug: string,
  announcementId: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("world_announcements")
    .delete({ count: "exact" })
    .eq("id", announcementId);
  if (error || count === 0) {
    throw new Error("刪除失敗,或你沒有權限");
  }

  revalidatePath(`/dashboard/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}`);
}
