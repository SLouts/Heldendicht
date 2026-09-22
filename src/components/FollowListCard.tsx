import Link from "next/link";
import { getProfileMediaPublicUrl } from "@/lib/profileMedia";

export type FollowProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
};

/** GitHub 的追蹤者/追蹤中清單那種小卡片:頭貼+名字一列,可選加一個右側的操作(例如取消追蹤按鈕)。 */
export function FollowListCard({
  profile,
  action,
}: {
  profile: FollowProfile;
  action?: React.ReactNode;
}) {
  const avatarUrl = getProfileMediaPublicUrl(profile.avatar_path);
  const label = profile.display_name || profile.username || "未知玩家";

  const content = (
    <>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- public bucket 網址,無法用 next/image 白名單網域
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        {profile.username && (
          <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
        )}
      </div>
    </>
  );

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2">
      {profile.username ? (
        <Link href={`/u/${profile.username}`} className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">{content}</div>
      )}
      {action}
    </div>
  );
}
