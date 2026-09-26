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

export type ProfileMediaKind = "avatar" | "banner";
export type UploadTicketResult =
  | { error: string }
  | { path: string; token: string };

const KIND_COLUMN: Record<ProfileMediaKind, "avatar_path" | "banner_path"> = {
  avatar: "avatar_path",
  banner: "banner_path",
};
const KIND_LABEL: Record<ProfileMediaKind, string> = {
  avatar: "頭貼",
  banner: "橫幅",
};

/**
 * 頭貼/橫幅上傳跟節點代表圖/世界地圖底圖同一套兩段式簽名上傳流程(見
 * lib/actions/nodeMedia.ts 的說明):先跟這裡要簽名上傳票券,瀏覽器直接
 * 把檔案傳到 Supabase Storage,完全不經過我們自己的 server——避免大圖片
 * (手機拍的照片常常好幾 MB)撞到 Vercel serverless function 的 request
 * body 大小限制,導致上傳整個失敗。
 */
export async function createProfileMediaUploadTicket(
  kind: ProfileMediaKind,
  contentType: string,
  fileSize: number,
): Promise<UploadTicketResult> {
  const user = await requireUser();

  if (fileSize <= 0) {
    return { error: "請選擇一張圖片" };
  }
  if (fileSize > PROFILE_MEDIA_MAX_BYTES) {
    return { error: "圖片不能超過 5MB" };
  }
  const ext = PROFILE_MEDIA_ALLOWED_TYPES[contentType];
  if (!ext) {
    return { error: "只接受 PNG / JPEG / WebP 圖片" };
  }

  const admin = createAdminClient();
  const path = `${user.id}/${KIND_COLUMN[kind]}-${Date.now()}.${ext}`;
  const { data, error } = await admin.storage
    .from(PROFILE_MEDIA_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createProfileMediaUploadTicket", kind, error);
    return { error: "無法建立上傳票券,請稍後再試" };
  }

  return { path: data.path, token: data.token };
}

/** 瀏覽器直接把檔案傳到 Supabase Storage 成功後,呼叫這裡把路徑寫回個人頁面資料。 */
export async function finalizeProfileMediaUpload(
  kind: ProfileMediaKind,
  path: string,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const column = KIND_COLUMN[kind];

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path, banner_path")
    .eq("id", user.id)
    .maybeSingle();

  const { error: updateError, count } = await supabase
    .from("profiles")
    .update(
      column === "avatar_path" ? { avatar_path: path } : { banner_path: path },
      { count: "exact" },
    )
    .eq("id", user.id);
  if (updateError || count === 0) {
    const admin = createAdminClient();
    await admin.storage.from(PROFILE_MEDIA_BUCKET).remove([path]);
    console.error("finalizeProfileMediaUpload", kind, updateError);
    return { error: `更新${KIND_LABEL[kind]}失敗,請稍後再試` };
  }

  const oldPath = profile?.[column];
  if (oldPath) {
    const admin = createAdminClient();
    await admin.storage.from(PROFILE_MEDIA_BUCKET).remove([oldPath]);
  }

  revalidatePath("/dashboard/profile");
  return undefined;
}
