"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type InviteCodeFormState =
  | { error: string }
  | { fieldErrors: Record<string, string[]> }
  | undefined;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 拿掉容易混淆的 I/O/0/1
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const CreateInviteCodeSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Za-z0-9-]*$/, { error: "邀請碼只能用英數字與連字號" }),
  maxUses: z.coerce.number().int().min(1, { error: "至少要能用 1 次" }),
  expiresAt: z.string(),
});

/**
 * 建立邀請碼。是否有權限完全交給 invite_codes_site_admin_only 這條
 * RLS policy 判斷(僅 site_admin),這裡不重複檢查——如果有人繞過
 * UI 直接呼叫,insert 會被 RLS 擋下來(0 rows / 42501 錯誤)。
 */
export async function createInviteCode(
  _prevState: InviteCodeFormState,
  formData: FormData,
): Promise<InviteCodeFormState> {
  const user = await requireUser();

  const parsed = CreateInviteCodeSchema.safeParse({
    code: (formData.get("code") as string)?.trim() ?? "",
    maxUses: formData.get("maxUses") || 1,
    expiresAt: formData.get("expiresAt") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invite_codes").insert({
    code: parsed.data.code || generateCode(),
    max_uses: parsed.data.maxUses,
    expires_at: parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt).toISOString()
      : null,
    created_by: user.id,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "這個邀請碼已經存在,換一個試試"
          : "你沒有權限建立邀請碼,或建立失敗",
    };
  }

  revalidatePath("/dashboard/admin/invite-codes");
  return undefined;
}

/** 刪除邀請碼(還沒被用掉的可以直接刪;已經有人用過的建議改設 max_uses=use_count 讓它失效,而不是刪掉造成使用紀錄外鍵孤兒)。 */
export async function deleteInviteCode(id: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("invite_codes")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error?.code === "23503") {
    throw new Error("這個邀請碼已經有人使用過,無法刪除;可以把使用上限改成跟目前使用次數一樣讓它失效");
  }
  if (error || count === 0) {
    throw new Error(error?.message ?? "你沒有權限刪除邀請碼");
  }

  revalidatePath("/dashboard/admin/invite-codes");
}
