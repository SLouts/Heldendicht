import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorldMediaSignedUrls } from "@/lib/worldMedia";
import { WorldCard } from "@/components/WorldCard";

/**
 * 個人世界觀展示整頁——比 /u/[username] 上那份摘要清單更完整,把這個人
 * 「主辦」跟「參與」的世界觀分開展示。可見度完全交給 public_world_memberships
 * 這個既有 RPC(公開世界觀,或訪客是追蹤者時額外含非公開世界觀),這裡
 * 不重複判斷一次。
 */
export default async function PublicWorldsPage({
  params,
}: PageProps<"/u/[username]/worlds">) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const { data: worlds } = await supabase.rpc("public_world_memberships", {
    p_user_id: profile.id,
  });

  const worldMediaUrls = await getWorldMediaSignedUrls(worlds ?? []);
  const worldCards = (worlds ?? []).map((w, i) => ({
    ...w,
    ...worldMediaUrls[i],
  }));

  const ownedWorlds = worldCards.filter((w) => w.is_owner);
  const joinedWorlds = worldCards.filter((w) => !w.is_owner);
  const label = profile.display_name || profile.username;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link href={`/u/${username}`} className="text-sm text-muted-foreground hover:underline">
        ← 返回 {label} 的個人頁面
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{label} 的世界觀</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">主辦的世界觀</h2>
        {ownedWorlds.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">目前沒有公開的主辦紀錄。</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ownedWorlds.map((w) => (
              <WorldCard
                key={w.world_id}
                slug={w.slug}
                name={w.name}
                tagline={w.tagline}
                bannerUrl={w.bannerUrl}
                iconUrl={w.iconUrl}
                badge="主辦"
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">參與的世界觀</h2>
        {joinedWorlds.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">目前沒有公開的參加紀錄。</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {joinedWorlds.map((w) => (
              <WorldCard
                key={w.world_id}
                slug={w.slug}
                name={w.name}
                tagline={w.tagline}
                bannerUrl={w.bannerUrl}
                iconUrl={w.iconUrl}
                badge={w.role}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
