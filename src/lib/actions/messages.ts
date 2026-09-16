"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";

export type SendMessageState =
  | { error: string }
  | { success: true }
  | undefined;

const SendMessageSchema = z.object({
  recipientId: z.uuid(),
  content: z.string().trim().min(1, { error: "訊息不能是空的" }),
});

/**
 * 傳送站內私訊。「不能傳給自己」「內容不能是空的」由 direct_messages 的
 * check constraint 把關,這裡的檢查只是提早給好懂的錯誤訊息。
 */
export async function sendMessage(
  _prevState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const user = await requireUser();

  const parsed = SendMessageSchema.safeParse({
    recipientId: formData.get("recipientId"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "訊息不能是空的" };
  }
  if (parsed.data.recipientId === user.id) {
    return { error: "不能傳訊息給自己" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("direct_messages").insert({
    sender_id: user.id,
    recipient_id: parsed.data.recipientId,
    content: parsed.data.content,
  });
  if (error) {
    return { error: "傳送失敗,請稍後再試" };
  }

  revalidatePath(`/dashboard/messages/${parsed.data.recipientId}`);
  revalidatePath("/dashboard/messages");
  return { success: true };
}

/**
 * 把跟某個對話對象之間、對方傳給我的訊息都標記已讀。用在開啟對話串頁面時。
 */
export async function markConversationRead(
  counterpartId: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", counterpartId)
    .eq("recipient_id", user.id)
    .is("read_at", null);
  revalidatePath("/dashboard", "layout");
}
