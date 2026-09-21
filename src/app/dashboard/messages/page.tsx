import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/unwrapRelation";

type ProfileSummary = {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
};

type MessageRow = {
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender: ProfileSummary | ProfileSummary[] | null;
  recipient: ProfileSummary | ProfileSummary[] | null;
};

/**
 * 站內私訊收件匣。direct_messages 沒有另外的 conversations 表,這裡直接
 * 撈出「所有跟我有關的訊息」(RLS 已經保證只會拿到我是寄件人或收件人的
 * 那些,不用另外加 .or 過濾),在應用層依對話對象分組,取每組最新一則
 * 當預覽、算未讀數。
 */
export default async function MessagesInboxPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("direct_messages")
    .select(
      "sender_id, recipient_id, content, created_at, read_at, sender:profiles!direct_messages_sender_id_fkey(id, username, display_name, email), recipient:profiles!direct_messages_recipient_id_fkey(id, username, display_name, email)",
    )
    .order("created_at", { ascending: false })
    .returns<MessageRow[]>();

  const conversations = new Map<
    string,
    { counterpart: ProfileSummary; lastContent: string; lastAt: string; unreadCount: number }
  >();

  for (const row of rows ?? []) {
    const isMine = row.sender_id === user.id;
    const counterpartId = isMine ? row.recipient_id : row.sender_id;
    const counterpartRaw = isMine ? row.recipient : row.sender;
    const counterpart = unwrapRelation(counterpartRaw);
    if (!counterpart) continue;

    if (!conversations.has(counterpartId)) {
      conversations.set(counterpartId, {
        counterpart,
        lastContent: row.content,
        lastAt: row.created_at,
        unreadCount: 0,
      });
    }
    if (!isMine && !row.read_at) {
      conversations.get(counterpartId)!.unreadCount += 1;
    }
  }

  const list = Array.from(conversations.entries());

  return (
    <div>
      <h1 className="text-2xl font-semibold">私訊</h1>

      {list.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          目前還沒有任何對話。到別人的個人頁面點「私訊」就可以開始。
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {list.map(([counterpartId, convo]) => {
            const label =
              convo.counterpart.display_name ||
              convo.counterpart.username ||
              convo.counterpart.email ||
              "未知使用者";
            return (
              <Link
                key={counterpartId}
                href={`/dashboard/messages/${counterpartId}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-primary/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{label}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {convo.lastContent}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(convo.lastAt).toLocaleDateString("zh-TW")}
                  </span>
                  {convo.unreadCount > 0 && (
                    <span className="rounded-full bg-badge-danger-bg px-2 py-0.5 text-xs text-badge-danger-fg">
                      {convo.unreadCount} 則未讀
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
