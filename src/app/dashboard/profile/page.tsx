import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getProfileMediaPublicUrl } from "@/lib/profileMedia";
import { uploadAvatar, uploadBanner } from "@/lib/actions/profile";
import { ProfileDetailsForm } from "./ProfileDetailsForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ProfileImageForm } from "./ProfileImageForm";
import { CreatePersonaForm } from "./CreatePersonaForm";
import { PersonaCard, type PersonaLink } from "./PersonaCard";
import type { PersonaField } from "@/lib/actions/personas";
import { unwrapRelation, toRelationArray } from "@/lib/unwrapRelation";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: profile }, { data: memberships }, { data: personas }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, username, bio, avatar_path, banner_path")
        .eq("id", user.id)
        .single(),
      supabase
        .from("world_memberships")
        .select("role, worlds(slug, name, is_public)")
        .eq("user_id", user.id),
      supabase
        .from("character_personas")
        .select(
          "id, name, tagline, bio, fields, avatar_path, characters(node_id, nodes(slug, title, status, worlds(slug, name)))",
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

  const avatarUrl = getProfileMediaPublicUrl(profile?.avatar_path ?? null);
  const bannerUrl = getProfileMediaPublicUrl(profile?.banner_path ?? null);

  const personaCards = (personas ?? []).map((p) => {
    const characterRows = toRelationArray(p.characters);
    const links: PersonaLink[] = characterRows.flatMap((c) => {
      const node = unwrapRelation(c.nodes);
      if (!node) return [];
      const world = unwrapRelation(node.worlds);
      if (!world) return [];
      return [
        {
          nodeId: c.node_id,
          nodeSlug: node.slug,
          title: node.title,
          worldSlug: world.slug,
          worldName: world.name,
          status: node.status,
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
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">個人頁面</h1>
        {profile?.username ? (
          <Link href={`/u/${profile.username}`} className="text-sm underline">
            查看公開頁面 →
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">
            設定網址代號後才會有公開頁面
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-6">
        <ProfileImageForm
          label="橫幅"
          action={uploadBanner}
          currentUrl={bannerUrl}
          previewClassName="h-32 w-full max-w-md rounded-lg border border-border object-cover sm:w-80"
        />
        <ProfileImageForm
          label="頭貼"
          action={uploadAvatar}
          currentUrl={avatarUrl}
          previewClassName="h-24 w-24 rounded-full border border-border object-cover"
        />
      </div>

      <ProfileDetailsForm
        displayName={profile?.display_name ?? null}
        username={profile?.username ?? null}
        bio={profile?.bio ?? null}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold">修改密碼</h2>
        <ChangePasswordForm />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">參加的世界觀</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          只有公開的世界觀會顯示在你的公開頁面上;私人世界觀只有你自己看得到這份清單。
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {memberships?.map((m, i) => {
            const world = unwrapRelation(m.worlds);
            if (!world) return null;
            return (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
              >
                <Link
                  href={`/dashboard/worlds/${world.slug}`}
                  className="font-medium hover:underline"
                >
                  {world.name}
                </Link>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  {!world.is_public && (
                    <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
                      私人
                    </span>
                  )}
                  {m.role}
                </span>
              </li>
            );
          })}
          {memberships?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              你還沒有加入任何世界觀。
            </p>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">你的跨世界觀角色(PC)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          同一隻角色如果在好幾個世界觀都有正式的角色節點,可以在這裡把它們連結成同一個身分,公開頁面上會合併展示。要連結某個世界觀的角色節點,到那個節點的頁面操作。
        </p>
        <CreatePersonaForm />
        <div className="mt-4 flex flex-col gap-3">
          {personaCards.map((p) => (
            <PersonaCard
              key={p.id}
              id={p.id}
              name={p.name}
              tagline={p.tagline}
              bio={p.bio}
              fields={p.fields}
              avatarUrl={p.avatarUrl}
              links={p.links}
            />
          ))}
          {personaCards.length === 0 && (
            <p className="text-sm text-muted-foreground">
              你還沒有建立任何跨世界觀角色身分。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
