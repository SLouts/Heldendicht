import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { removeMember } from "@/lib/actions/memberships";
import { InviteMemberForm } from "./InviteMemberForm";
import { RoleSelect } from "./RoleSelect";
import { unwrapRelation } from "@/lib/unwrapRelation";

export default async function MembersPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/members">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: isAdmin } = await supabase.rpc("is_world_admin", {
    p_world_id: world.id,
  });

  if (!isAdmin) {
    return (
      <div>
        <BackLink slug={slug} />
        <h1 className="mt-2 text-2xl font-semibold">世界觀成員</h1>
      </div>
    );
  }

  const { data: members } = await supabase
    .from("world_memberships")
    .select("id, role, status, joined_at, profiles(display_name, username, email)")
    .eq("world_id", world.id)
    .order("joined_at", { ascending: true });

  return (
    <div>
      <BackLink slug={slug} />
      <h1 className="mt-2 text-2xl font-semibold">{world.name} 的成員</h1>

      <InviteMemberForm worldId={world.id} worldSlug={world.slug} />

      <ul className="mt-6 flex flex-col gap-2">
        {members?.map((m) => {
          const profile = unwrapRelation(m.profiles);
          const label =
            profile?.display_name || profile?.username || profile?.email || "未知使用者";
          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(m.joined_at).toLocaleDateString("zh-TW")} 加入
              </span>
              <RoleSelect
                membershipId={m.id}
                worldSlug={world.slug}
                currentRole={m.role}
              />
              <form action={removeMember.bind(null, m.id, world.slug)} className="ml-auto">
                <button type="submit" className="text-sm text-danger underline">
                  移除
                </button>
              </form>
            </li>
          );
        })}
        {members?.length === 0 && (
          <p className="text-sm text-muted-foreground">目前還沒有其他成員。</p>
        )}
      </ul>
    </div>
  );
}

function BackLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/dashboard/worlds/${slug}`}
      className="text-sm text-muted-foreground hover:underline"
    >
      ← 返回世界觀
    </Link>
  );
}
