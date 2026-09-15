"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dal";
import type { Json } from "@/lib/supabase/database.types";
import {
  PROFILE_MEDIA_BUCKET,
  PROFILE_MEDIA_MAX_BYTES,
  PROFILE_MEDIA_ALLOWED_TYPES,
} from "@/lib/profileMedia";

export type PersonaFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

export type PersonaField = { label: string; value: string };

const PersonaFieldSchema = z.object({
  label: z.string().trim().min(1).max(30),
  value: z.string().trim().min(1).max(200),
});
const PersonaFieldsSchema = z.array(PersonaFieldSchema).max(20);

/** 表單裡的自訂欄位是用一個隱藏 input 存 JSON 字串送過來的,這裡解析+驗證。 */
function parsePersonaFields(raw: FormDataEntryValue | null): PersonaField[] | null {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = PersonaFieldsSchema.safeParse(json);
  return result.success ? result.data : null;
}

const PersonaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "請輸入名字" })
    .max(50, { error: "名字最多 50 字" }),
  tagline: z.string().trim().max(200, { error: "一句話介紹最多 200 字" }),
  bio: z.string().trim().max(1000, { error: "介紹最多 1000 字" }),
});

/** 建立一個新的跨世界觀角色身分(還沒連結到任何世界觀的節點)。 */
export async function createPersona(
  _prevState: PersonaFormState,
  formData: FormData,
): Promise<PersonaFormState> {
  const user = await requireUser();

  const parsed = PersonaSchema.safeParse({
    name: formData.get("name") ?? "",
    tagline: formData.get("tagline") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const fields = parsePersonaFields(formData.get("fields"));
  if (fields === null) {
    return { error: "基本資料欄位格式不正確" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("character_personas").insert({
    owner_id: user.id,
    name: parsed.data.name,
    tagline: parsed.data.tagline || null,
    bio: parsed.data.bio || null,
    fields: fields as unknown as Json,
  });
  if (error) {
    return { error: "建立失敗,請稍後再試" };
  }

  revalidatePath("/dashboard/profile");
  return undefined;
}

export async function updatePersona(
  _prevState: PersonaFormState,
  formData: FormData,
): Promise<PersonaFormState> {
  const user = await requireUser();

  const personaId = formData.get("personaId");
  if (typeof personaId !== "string") {
    return { error: "缺少必要欄位" };
  }

  const parsed = PersonaSchema.safeParse({
    name: formData.get("name") ?? "",
    tagline: formData.get("tagline") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const fields = parsePersonaFields(formData.get("fields"));
  if (fields === null) {
    return { error: "基本資料欄位格式不正確" };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("character_personas")
    .update(
      {
        name: parsed.data.name,
        tagline: parsed.data.tagline || null,
        bio: parsed.data.bio || null,
        fields: fields as unknown as Json,
      },
      { count: "exact" },
    )
    .eq("id", personaId)
    .eq("owner_id", user.id);
  if (error || count === 0) {
    return { error: "更新失敗,請稍後再試" };
  }

  revalidatePath("/dashboard/profile");
  return undefined;
}

/** 刪掉一個跨世界觀角色身分。各世界觀底下的角色節點本身不受影響,只是解除連結。 */
export async function deletePersona(personaId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: persona } = await supabase
    .from("character_personas")
    .select("avatar_path")
    .eq("id", personaId)
    .maybeSingle();

  const { error, count } = await supabase
    .from("character_personas")
    .delete({ count: "exact" })
    .eq("id", personaId)
    .eq("owner_id", user.id);
  if (error || count === 0) {
    throw new Error("刪除失敗,或這不是你的角色");
  }

  if (persona?.avatar_path) {
    const admin = createAdminClient();
    await admin.storage.from(PROFILE_MEDIA_BUCKET).remove([persona.avatar_path]);
  }

  revalidatePath("/dashboard/profile");
}

export async function uploadPersonaAvatar(
  _prevState: PersonaFormState,
  formData: FormData,
): Promise<PersonaFormState> {
  const user = await requireUser();

  const personaId = formData.get("personaId");
  const file = formData.get("file");
  if (typeof personaId !== "string" || !(file instanceof File)) {
    return { error: "缺少必要欄位" };
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
  const { data: persona } = await supabase
    .from("character_personas")
    .select("owner_id, avatar_path")
    .eq("id", personaId)
    .maybeSingle();
  if (!persona || persona.owner_id !== user.id) {
    return { error: "找不到這個角色,或這不是你的角色" };
  }

  const admin = createAdminClient();
  const path = `${user.id}/persona-${personaId}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { error: "上傳失敗,請稍後再試" };
  }

  const { error: updateError, count } = await supabase
    .from("character_personas")
    .update({ avatar_path: path }, { count: "exact" })
    .eq("id", personaId)
    .eq("owner_id", user.id);
  if (updateError || count === 0) {
    await admin.storage.from(PROFILE_MEDIA_BUCKET).remove([path]);
    return { error: "更新失敗,請稍後再試" };
  }

  if (persona.avatar_path) {
    await admin.storage.from(PROFILE_MEDIA_BUCKET).remove([persona.avatar_path]);
  }

  revalidatePath("/dashboard/profile");
  return undefined;
}

const SetCharacterPersonaSchema = z.object({
  nodeId: z.uuid(),
  worldSlug: z.string().min(1),
  personaId: z.union([z.uuid(), z.literal("")]),
});

/**
 * 把某個世界觀底下的 PC 角色節點連結/解除連結到一個跨世界觀角色身分。
 * 「這是不是你自己的角色」交給 characters_update RLS policy 把關
 * (owner_id = auth.uid());「persona 是不是你自己的」交給
 * guard_character_persona_owner trigger 把關,這裡不重複檢查。
 */
export async function setCharacterPersona(
  _prevState: PersonaFormState,
  formData: FormData,
): Promise<PersonaFormState> {
  await requireUser();

  const parsed = SetCharacterPersonaSchema.safeParse({
    nodeId: formData.get("nodeId"),
    worldSlug: formData.get("worldSlug"),
    personaId: formData.get("personaId") ?? "",
  });
  if (!parsed.success) {
    return { error: "資料格式不正確" };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("characters")
    .update(
      { persona_id: parsed.data.personaId || null },
      { count: "exact" },
    )
    .eq("node_id", parsed.data.nodeId);

  if (error) {
    return {
      error: error.message.includes("只能連結")
        ? error.message
        : "更新失敗,請稍後再試",
    };
  }
  if (count === 0) {
    return { error: "找不到這個角色,或你沒有權限" };
  }

  revalidatePath(`/dashboard/worlds/${parsed.data.worldSlug}`);
  return undefined;
}

/** 從個人頁面「解除連結」按鈕直接呼叫,不需要顯示表單錯誤,失敗就直接丟例外。 */
export async function unlinkCharacterPersona(
  nodeId: string,
  worldSlug: string,
): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("characters")
    .update({ persona_id: null }, { count: "exact" })
    .eq("node_id", nodeId);
  if (error || count === 0) {
    throw new Error("解除連結失敗,或你沒有權限");
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/dashboard/worlds/${worldSlug}`);
}
