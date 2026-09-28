import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getCurrentProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getProfileMediaPublicUrl } from "@/lib/profileMedia";
import { getMessageAttachmentSignedUrl } from "@/lib/messageAttachments";
import { Avatar } from "@/components/Avatar";
import { MessageComposeForm } from "./MessageComposeForm";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function MessageThreadPage({
  params,
}: PageProps<"/dashboard/messages/[userId]">) {
  const { userId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: counterpart }, myProfile] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, email, avatar_path")
      .eq("id", userId)
      .maybeSingle(),
    getCurrentProfile(),
  ]);

  if (!counterpart) notFound();

  const counterpartAvatarUrl = getProfileMediaPublicUrl(counterpart.avatar_path);
  const myAvatarUrl = getProfileMediaPublicUrl(myProfile?.avatar_path ?? null);

  // 進到對話串就把對方傳給我、還沒讀的訊息標記已讀。
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", counterpart.id)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  const { data: messages } = await supabase
    .from("direct_messages")
    .select(
      "id, sender_id, content, created_at, direct_message_attachments(id, storage_path, file_name, content_type, file_size, kind)",
    )
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${counterpart.id}),and(sender_id.eq.${counterpart.id},recipient_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true });

  const messagesWithAttachmentUrls = await Promise.all(
    (messages ?? []).map(async (m) => ({
      ...m,
      attachments: await Promise.all(
        m.direct_message_attachments.map(async (a) => ({
          ...a,
          url: await getMessageAttachmentSignedUrl(
            a.storage_path,
            a.kind === "file" ? a.file_name : undefined,
          ),
        })),
      ),
    })),
  );

  const label =
    counterpart.display_name || counterpart.username || counterpart.email || "未知使用者";

  return (
    <div>
      <Link href="/dashboard/messages" className="text-sm text-muted-foreground hover:underline">
        ← 私訊
      </Link>
      <div className="mt-2 flex items-center gap-2">
        <Avatar url={counterpartAvatarUrl} />
        <h1 className="text-2xl font-semibold">
          {counterpart.username ? (
            <Link href={`/u/${counterpart.username}`} className="hover:underline">
              {label}
            </Link>
          ) : (
            label
          )}
        </h1>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {messagesWithAttachmentUrls.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            目前還沒有訊息,傳第一則打招呼吧。
          </p>
        ) : (
          messagesWithAttachmentUrls.map((m) => {
            const isMine = m.sender_id === user.id;
            return (
              <div
                key={m.id}
                className={
                  "flex items-end gap-2 " + (isMine ? "flex-row-reverse" : "flex-row")
                }
              >
                <Avatar url={isMine ? myAvatarUrl : counterpartAvatarUrl} />
                <div
                  className={
                    "max-w-md whitespace-pre-wrap rounded-lg px-3 py-2 text-sm " +
                    (isMine
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface")
                  }
                >
                  {m.content && <p>{m.content}</p>}
                  {m.attachments.length > 0 && (
                    <div className={"flex flex-wrap gap-2" + (m.content ? " mt-2" : "")}>
                      {m.attachments.map((a) =>
                        a.kind === "image" ? (
                          <a key={a.id} href={a.url ?? undefined} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL,無法用 next/image 白名單網域 */}
                            <img
                              src={a.url ?? undefined}
                              alt={a.file_name}
                              className="h-32 w-32 rounded-md object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            key={a.id}
                            href={a.url ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className={
                              "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs underline " +
                              (isMine ? "border-primary-foreground/30" : "border-border")
                            }
                          >
                            <span className="truncate">{a.file_name}</span>
                            <span className="shrink-0 opacity-70">{formatSize(a.file_size)}</span>
                          </a>
                        ),
                      )}
                    </div>
                  )}
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
