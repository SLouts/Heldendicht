import Link from "next/link";

export type DashboardWorldItem = {
  id: string;
  slug: string;
  name: string;
  role: string;
};

function WorldGrid({ worlds, emptyMessage }: { worlds: DashboardWorldItem[]; emptyMessage: string }) {
  if (worlds.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {worlds.map((world) => (
        <Link
          key={world.id}
          href={`/dashboard/worlds/${world.slug}`}
          className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-primary/50"
        >
          <span className="font-medium">{world.name}</span>
          <span className="text-sm text-muted-foreground">{world.role}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * 世界觀工作區選擇中樞——分「我發起的」(worlds.owner_id 是自己)跟
 * 「我參與的」(其餘)兩組。owner_id 是不是自己交給呼叫端(page.tsx)先分好,
 * 這裡只負責排版,不重複判斷。
 */
export function DashboardWorldsSection({
  ownedWorlds,
  joinedWorlds,
}: {
  ownedWorlds: DashboardWorldItem[];
  joinedWorlds: DashboardWorldItem[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">世界觀工作區</h2>
        <Link
          href="/dashboard/worlds/new"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover"
        >
          + 建立新世界觀
        </Link>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-muted-foreground">我發起的世界觀</h3>
        <div className="mt-2">
          <WorldGrid worlds={ownedWorlds} emptyMessage="還沒有發起任何世界觀。" />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-muted-foreground">我參與的世界觀</h3>
        <div className="mt-2">
          <WorldGrid worlds={joinedWorlds} emptyMessage="還沒有加入任何世界觀,請聯絡世界觀主辦邀請你加入。" />
        </div>
      </div>
    </div>
  );
}
