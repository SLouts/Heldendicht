import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getWorldMediaSignedUrl } from "@/lib/worldMedia";
import { WorldHero } from "./WorldHero";
import { WorldStatCards } from "./WorldStatCards";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { WorldRulesTab } from "@/app/(site)/worlds/[slug]/WorldRulesTab";
import { WorldRecentChangesTab } from "@/app/(site)/worlds/[slug]/WorldRecentChangesTab";
import { WorldSidebar } from "@/app/(site)/worlds/[slug]/WorldSidebar";
import { WorldQuickBar } from "@/app/(site)/worlds/[slug]/WorldQuickBar";
import { NewWorldOnboarding } from "./NewWorldOnboarding";
import { unwrapRelation } from "@/lib/unwrapRelation";

const RECENT_CHANGES_LIMIT = 8;

export default async function WorldDashboardPage({
  params,
  searchParams,
}: PageProps<"/dashboard/worlds/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const isNewlyCreated = sp.new === "1";
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select(
      "id, slug, name, tagline, description, default_pc_quota, is_public, is_solo, banner_path, icon_path, owner_id, profiles!worlds_owner_id_fkey(display_name, username, email)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!world) notFound();

  const owner = unwrapRelation(world.profiles);

  const [
    { data: isStaff },
    { data: isAdmin },
    { data: nodes },
    { data: worldRules },
    { data: recentNodes },
    bannerUrl,
    iconUrl,
  ] = await Promise.all([
    supabase.rpc("is_world_staff", { p_world_id: world.id }),
    supabase.rpc("is_world_admin", { p_world_id: world.id }),
    supabase
      .from("nodes")
      .select("id, node_type, edit_mode, characters(character_type)")
      .eq("world_id", world.id),
    supabase
      .from("world_rule_fields")
      .select("id, label, content")
      .eq("world_id", world.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("nodes")
      .select("id, title, slug, node_type, status, updated_at")
      .eq("world_id", world.id)
      .eq("is_placeholder", false)
      .order("updated_at", { ascending: false })
      .limit(RECENT_CHANGES_LIMIT),
    getWorldMediaSignedUrl(world.banner_path),
    getWorldMediaSignedUrl(world.icon_path),
  ]);

  const nodeRows = nodes ?? [];
  const totalNodeCount = nodeRows.length;
  const collaborativeCount = nodeRows.filter((n) => n.edit_mode === "collaborative").length;
  const collaborativePercent =
    totalNodeCount === 0 ? null : Math.round((collaborativeCount / totalNodeCount) * 100);
  const pcCount = nodeRows.filter(
    (n) => n.node_type === "character" && unwrapRelation(n.characters)?.character_type === "pc",
  ).length;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← 我的世界觀
      </Link>

      <div className="mt-2">
        <WorldHero name={world.name} tagline={world.tagline} bannerUrl={bannerUrl} iconUrl={iconUrl} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Badge variant={world.is_public ? "info" : "neutral"}>
          {world.is_public ? "公開" : "私人"}
        </Badge>
        <Badge variant="neutral">{world.is_solo ? "個人寫作(paro)" : "多人共筆"}</Badge>
      </div>

      {isNewlyCreated && <NewWorldOnboarding worldSlug={world.slug} isSolo={world.is_solo} />}

      <WorldQuickBar worldSlug={world.slug} />

      <div className="mt-6">
        <WorldStatCards
          ownerLabel={owner?.display_name || owner?.username || owner?.email || null}
          collaborativePercent={collaborativePercent}
          totalNodeCount={totalNodeCount}
          pcCount={pcCount}
          defaultPcQuota={world.default_pc_quota}
        />
      </div>

      <div className="mt-8">
        <WorldMainTabs basePath={`/dashboard/worlds/${world.slug}`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:order-2 lg:col-span-4">
          <WorldSidebar
            navMenu={
              <>
                <Link
                  href={`/worlds/${world.slug}`}
                  className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                >
                  公開頁面
                </Link>
                {isStaff && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/character-template`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    角色卡設定
                  </Link>
                )}
                {isStaff && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/categories`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    內容分類
                  </Link>
                )}
                {isStaff && !world.is_solo && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/reports`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    檢舉列表
                  </Link>
                )}
                {isAdmin && !world.is_solo && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/members`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    成員
                  </Link>
                )}
                {isStaff && (
                  <Link
                    href={`/dashboard/worlds/${world.slug}/settings`}
                    className="rounded-md px-3 py-1.5 hover:bg-surface hover:underline"
                  >
                    世界觀設定
                  </Link>
                )}
              </>
            }
          />
        </div>

        <div className="lg:order-1 lg:col-span-8 lg:min-w-0 flex flex-col gap-8">
          {world.description ? (
            <p className="max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
              {world.description}
            </p>
          ) : (
            <EmptyState
              title="這個世界觀還沒有介紹文字"
              description="寫一段導讀,讓來訪的人快速了解這個世界觀的樣貌。"
              actionHref={isStaff ? `/dashboard/worlds/${world.slug}/settings` : undefined}
              actionLabel={isStaff ? "撰寫第一篇導讀" : undefined}
            />
          )}

          <WorldRulesTab
            worldRules={worldRules}
            manageHref={isStaff ? `/dashboard/worlds/${world.slug}/rules` : undefined}
          />

          <WorldRecentChangesTab
            nodes={recentNodes}
            basePath={`/dashboard/worlds/${world.slug}/nodes`}
          />
        </div>
      </div>
    </div>
  );
}
