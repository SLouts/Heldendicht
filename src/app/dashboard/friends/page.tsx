import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { UnfollowButton } from "./UnfollowButton";

type ProfileSummary = {
  id: string;
  username: string | null;
  display_name: string | null;
};

function ProfileRow({
  profile,
  action,
}: {
  profile: ProfileSummary;
  action?: React.ReactNode;
}) {
  const label = profile.display_name || profile.username || "未知玩家";
  return (
    <li className="flex items-center justify-between gap-2 py-3">
      {profile.username ? (
        <Link href={`/u/${profile.username}`} className="hover:underline">
          {label}
        </Link>
      ) : (
        <span>{label}</span>
      )}
      {action}
    </li>
  );
}

export default async function FriendsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: following }, { data: followers }] = await Promise.all([
    supabase
      .from("follows")
      .select("created_at, followee:profiles!follows_followee_id_fkey(id, username, display_name)")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("follows")
      .select("created_at, follower:profiles!follows_follower_id_fkey(id, username, display_name)")
      .eq("followee_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const followingProfiles = (following ?? [])
    .map((f) => (Array.isArray(f.followee) ? f.followee[0] : f.followee))
    .filter((p): p is ProfileSummary => p != null);

  const followerProfiles = (followers ?? [])
    .map((f) => (Array.isArray(f.follower) ? f.follower[0] : f.follower))
    .filter((p): p is ProfileSummary => p != null);

  return (
    <div>
      <h1 className="text-2xl font-semibold">好友</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        追蹤別人可以在對方的個人頁面多看到一項:對方參加的非公開世界觀清單。
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">追蹤中 ({followingProfiles.length})</h2>
        {followingProfiles.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            還沒有追蹤任何人——到別人的個人頁面按「追蹤」即可。
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {followingProfiles.map((p) => (
              <ProfileRow
                key={p.id}
                profile={p}
                action={<UnfollowButton followeeId={p.id} username={p.username ?? undefined} />}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">追蹤者 ({followerProfiles.length})</h2>
        {followerProfiles.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">目前還沒有人追蹤你。</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {followerProfiles.map((p) => (
              <ProfileRow key={p.id} profile={p} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
