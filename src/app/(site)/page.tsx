import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// 首頁不需要登入就能看 —— 依靠 worlds 表的 RLS policy
// (is_public 或本人是成員 或 site_admin)自動篩選,這裡不用額外判斷權限。
export default async function Home() {
  const supabase = await createClient();
  const { data: worlds } = await supabase
    .from("worlds")
    .select("id, slug, name, tagline, cover_image_url")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          歡迎來到多世界觀企劃站
        </h1>

        <h2 className="mt-10 text-xl font-semibold">公開世界觀</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {worlds?.map((world) => (
            <Link
              key={world.id}
              href={`/worlds/${world.slug}`}
              className="rounded-lg border border-border bg-surface p-4 transition hover:border-primary/50"
            >
              <div className="font-medium">{world.name}</div>
              {world.tagline && (
                <div className="mt-1 text-sm text-muted-foreground">
                  {world.tagline}
                </div>
              )}
            </Link>
          ))}
          {worlds?.length === 0 && (
            <p className="text-sm text-muted-foreground">目前還沒有公開的世界觀。</p>
          )}
        </div>
      </main>
    </div>
  );
}
