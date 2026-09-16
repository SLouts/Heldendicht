import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { MessageComposeForm } from "./MessageComposeForm";

export default async function MessageThreadPage({
  params,
}: PageProps<"/dashboard/messages/[userId]">) {
  const { userId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: counterpart } = await supabase
    .from("profiles")
    .select("id, username, display_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (!counterpart) notFound();

  // 進到對話串就把對方傳給我、還沒讀的訊息標記已讀。
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", counterpart.id)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  const { data: messages } = await supabase
    .from("direct_messages")
    .select("id, sender_id, content, created_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${counterpart.id}),and(sender_id.eq.${counterpart.id},recipient_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true });

  const label =
    counterpart.display_name || counterpart.username || counterpart.email || "未知使用者";

  return (
    <div>
      <Link href="/dashboard/messages" className="text-sm text-muted-foreground hover:underline">
        ← 私訊
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        {counterpart.username ? (
          <Link href={`/u/${counterpart.username}`} className="hover:underline">
            {label}
          </Link>
        ) : (
          label
        )}
      </h1>

      <div className="mt-6 flex flex-col gap-2">
        {(messages ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            目前還沒有訊息,傳第一則打招呼吧。
          </p>
        ) : (
          (messages ?? []).map((m) => {
            const isMine = m.sender_id === user.id;
            return (
              <div key={m.id} className={"flex " + (isMine ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-md whitespace-pre-wrap rounded-lg px-3 py-2 text-sm " +
                    (isMine
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface")
                  }
                >
                  <p>{m.content}</p>
                  <p
                    className={
                      "mt-1 text-[10px] " +
                      (isMine ? "text-primary-foreground/70" : "text-muted-foreground")
                    }
                  >
                    {new Date(m.created_at).toLocaleString("zh-TW")}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageComposeForm recipientId={counterpart.id} />
    </div>
  );
}
