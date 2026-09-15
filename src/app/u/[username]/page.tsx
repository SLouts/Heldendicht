import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileMediaPublicUrl } from "@/lib/profileMedia";
import type { PersonaField } from "@/lib/actions/personas";

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

  const [{ data: worlds }, { data: personas }] = await Promise.all([
    supabase.rpc("public_world_memberships", { p_user_id: profile.id }),
    supabase
      .from("character_personas")
      .select(
        "id, name, tagline, bio, fields, avatar_path, characters(node_id, nodes(slug, title, status, worlds(slug, name)))",
      )
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: true }),
  ]);

  const avatarUrl = getProfileMediaPublicUrl(profile.avatar_path);
  const bannerUrl = getProfileMediaPublicUrl(profile.banner_path);
  const label = profile.display_name || profile.username;

  const personaCards = (personas ?? [])
    .map((p) => {
      const characterRows = Array.isArray(p.characters)
        ? p.characters
        : p.characters
          ? [p.characters]
          : [];
      const links = characterRows.flatMap((c) => {
        const node = Array.isArray(c.nodes) ? c.nodes[0] : c.nodes;
        if (!node) return [];
        const world = Array.isArray(node.worlds) ? node.worlds[0] : node.worlds;
        if (!world) return [];
        return [
          {
            title: node.title,
            nodeSlug: node.slug,
            status: node.status,
            worldSlug: world.slug,
            worldName: world.name,
          },
        ];
      });
      return {
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        bio: p.bio,
        fields: (Array.isArray(p.fields) ? p.fields : []) as PersonaField[],
        avatarUrl: getProfileMediaPublicUrl(p.avatar_path),
        links,
      };
    })
    // 沒有任何看得到的世界觀連結就不展示——避免出現一張看起來像壞掉的空卡片。
    .filter((p) => p.links.length > 0);

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

        {personaCards.length > 0 && (
          <>
            <h2 className="mt-10 text-lg font-semibold">PC</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {personaCards.map((p) => (
                <div
                  key={p.id}
                  className="flex gap-3 rounded-lg border border-border bg-surface p-4"
                >
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- public bucket 網址,無法用 next/image 白名單網域
                    <img
                      src={p.avatarUrl}
                      alt={p.name}
                      className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-full border border-border bg-muted" />
                  )}
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.tagline && (
                      <p className="mt-0.5 text-sm italic text-muted-foreground">
                        「{p.tagline}」
                      </p>
                    )}
                    {p.fields.length > 0 && (
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                        {p.fields.map((f, i) => (
                          <div key={i} className="flex gap-1">
                            <dt className="text-muted-foreground">{f.label}</dt>
                            <dd>{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {p.bio && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {p.bio}
                      </p>
                    )}
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {p.links.map((link, i) => (
                        <li key={i}>
                          <Link
                            href={`/worlds/${link.worldSlug}/nodes/${link.nodeSlug}`}
                            className="hover:underline"
                          >
                            {link.worldName} ·{link.title}
                            {link.status === "pending" && "(未正式過審)"}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
