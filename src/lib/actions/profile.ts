"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";
import {
  PROFILE_MEDIA_BUCKET,
  PROFILE_MEDIA_MAX_BYTES,
  PROFILE_MEDIA_ALLOWED_TYPES,
} from "@/lib/profileMedia";

export type ProfileFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const UsernameSchema = z
  .string()
  .regex(/^[a-z0-9_-]{3,20}$/, {
    error: "網址代號只能用小寫英文、數字、底線與連字號,長度 3~20",
  });

const UpdateProfileSchema = z.object({
  displayName: z.string().trim().max(50, { error: "暱稱最多 50 字" }),
  username: z.union([UsernameSchema, z.literal("")]),
  bio: z.string().trim().max(1000, { error: "自我介紹最多 1000 字" }),
});

/** 更新個人頁面的暱稱/網址代號/自我介紹。 */
export async function updateProfileDetails(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();

  const parsed = UpdateProfileSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    username: formData.get("username") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName || null,
      username: parsed.data.username || null,
      bio: parsed.data.bio || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "這個網址代號已經有人用了,換一個看看" };
    }
    return { error: "更新失敗,請稍後再試" };
  }

  revalidatePath("/dashboard/profile");
  if (parsed.data.username) revalidatePath(`/u/${parsed.data.username}`);
  return undefined;
}

async function uploadProfileMedia(
  formData: FormData,
  column: "avatar_path" | "banner_path",
): Promise<ProfileFormState> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "缺少檔案" };
  }
  if (file.size === 0) {
    return { error: "請選擇一張圖片" };
  }
  if (file.size > PROFILE_MEDIA_MAX_BYTES) {
    return { error: "圖片不能超過 5MB" };
  }
  const ext = PROFILE_MEDIA_ALLOWED_TYPES[file.type];
  if (!ext) {
    return { error: "只接受 PNG / JPEG / WebP 圖片" };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path, banner_path")
    .eq("id", user.id)
    .maybeSingle();

  const admin = createAdminClient();
  const path = `${user.id}/${column}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { error: "上傳失敗,請稍後再試" };
  }

  const updatePayload =
    column === "avatar_path" ? { avatar_path: path } : { banner_path: path };
  const { error: updateError, count } = await supabase
    .from("profiles")
    .update(updatePayload, { count: "exact" })
    .eq("id", user.id);
  if (updateError || count === 0) {
    await admin.storage.from(PROFILE_MEDIA_BUCKET).remove([path]);
    return { error: "更新失敗,請稍後再試" };
  }

  const oldPath =
    column === "avatar_path" ? profile?.avatar_path : profile?.banner_path;
  if (oldPath) {
    await admin.storage.from(PROFILE_MEDIA_BUCKET).remove([oldPath]);
  }

  revalidatePath("/dashboard/profile");
  return undefined;
}

export async function uploadAvatar(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  return uploadProfileMedia(formData, "avatar_path");
}

export async function uploadBanner(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  return uploadProfileMedia(formData, "banner_path");
}
