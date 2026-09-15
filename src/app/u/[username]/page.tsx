import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileMediaPublicUrl } from "@/lib/profileMedia";

export default async function PublicProfilePage({
  params,
}: PageProps<"/u/[username]">) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_path, banner_path")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const { data: worlds } = await supabase.rpc("public_world_memberships", {
    p_user_id: profile.id,
  });

  const avatarUrl = getProfileMediaPublicUrl(profile.avatar_path);
  const bannerUrl = getProfileMediaPublicUrl(profile.banner_path);
  const label = profile.display_name || profile.username;

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div
        className="h-48 w-full sm:h-64"
        style={
          bannerUrl
            ? {
                backgroundImage: `url(${bannerUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { background: "linear-gradient(135deg, var(--primary), var(--muted))" }
        }
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
        <div className="-mt-12 flex items-end gap-4 sm:-mt-16">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- public bucket 網址,無法用 next/image 白名單網域
            <img
              src={avatarUrl}
              alt={label ?? ""}
              className="h-24 w-24 rounded-full border-4 border-background object-cover sm:h-32 sm:w-32"
            />
          ) : (
            <div className="h-24 w-24 rounded-full border-4 border-background bg-muted sm:h-32 sm:w-32" />
          )}
        </div>

        <h1 className="mt-4 text-2xl font-semibold">{label}</h1>
        {profile.username && (
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        )}

        {profile.bio && (
          <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm">
            {profile.bio}
          </p>
        )}

        <h2 className="mt-10 text-lg font-semibold">參加的企劃</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {worlds?.map((w) => (
            <Link
              key={w.world_id}
              href={`/worlds/${w.slug}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-primary/50"
            >
              <span className="font-medium">{w.name}</span>
              <span className="text-xs text-muted-foreground">{w.role}</span>
            </Link>
          ))}
          {(!worlds || worlds.length === 0) && (
            <p className="text-sm text-muted-foreground">
              目前沒有公開的參加紀錄。
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
