"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type WorldFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

const SlugSchema = z
  .string()
  .min(1, { error: "請輸入 slug" })
  .regex(/^[a-z0-9-]+$/, { error: "slug 只能用小寫英文、數字與連字號" });

const CreateWorldSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1, { error: "請輸入世界觀名稱" }),
  tagline: z.string(),
  description: z.string(),
  defaultPcQuota: z.coerce.number().int().min(0, { error: "配額不能是負數" }),
  isPublic: z.boolean(),
});

/**
 * 建立世界觀。任何登入的使用者都可以建立(worlds_insert_authenticated policy),
 * 建立後 DB trigger(handle_new_world)會自動把建立者寫進 world_memberships 當 admin,
 * 這裡不用手動再 insert 一次成員資格。
 */
export async function createWorld(
  _prevState: WorldFormState,
  formData: FormData,
): Promise<WorldFormState> {
  const user = await requireUser();

  const parsed = CreateWorldSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    tagline: formData.get("tagline") ?? "",
    description: formData.get("description") ?? "",
    defaultPcQuota: formData.get("defaultPcQuota") || 3,
    isPublic: formData.get("isPublic") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worlds")
    .insert({
      slug: parsed.data.slug,
      name: parsed.data.name,
      tagline: parsed.data.tagline || null,
      description: parsed.data.description || null,
      default_pc_quota: parsed.data.defaultPcQuota,
      is_public: parsed.data.isPublic,
      owner_id: user.id,
    })
    .select("slug")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505" ? "這個 slug 已經被使用了" : "建立失敗,請稍後再試",
    };
  }

  redirect(`/dashboard/worlds/${data.slug}`);
}

const UpdateWorldSchema = CreateWorldSchema.omit({ slug: true }).extend({
  worldId: z.uuid(),
  worldSlug: z.string(),
});

/**
 * 更新世界觀設定。只在 UI 上檢查過「目前使用者是 admin」才會顯示這個表單,
 * 但真正擋住非 admin 亂改的是 worlds_update_admin 這條 RLS policy——
 * 就算有人繞過前端直接打 API,RLS 一樣會擋下來(update 影響 0 rows)。
 */
export async function updateWorldSettings(
  _prevState: WorldFormState,
  formData: FormData,
): Promise<WorldFormState> {
  await requireUser();

  const parsed = UpdateWorldSchema.safeParse({
    worldId: formData.get("worldId"),
    worldSlug: formData.get("worldSlug"),
    name: formData.get("name"),
    tagline: formData.get("tagline") ?? "",
    description: formData.get("description") ?? "",
    defaultPcQuota: formData.get("defaultPcQuota") || 0,
    isPublic: formData.get("isPublic") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("worlds")
    .update(
      {
        name: parsed.data.name,
        tagline: parsed.data.tagline || null,
        description: parsed.data.description || null,
        default_pc_quota: parsed.data.defaultPcQuota,
        is_public: parsed.data.isPublic,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.worldId);

  if (error) {
    return { error: "更新失敗,請稍後再試" };
  }
  if (count === 0) {
    return { error: "你沒有權限修改這個世界觀的設定" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}`);
  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}/settings`);
  return undefined;
}
