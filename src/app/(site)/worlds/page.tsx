import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function WorldsPage() {
  const supabase = await createClient();
  const { data: worlds } = await supabase
    .from("worlds")
    .select("id, slug, name, tagline, description")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">探索公開世界觀</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {worlds?.map((world) => (
          <Link
            key={world.id}
            href={`/worlds/${world.slug}`}
            className="rounded-lg border border-border bg-surface p-4 transition hover:border-primary/50"
          >
            <div className="font-medium">{world.name}</div>
            {world.tagline && (
              <div className="mt-1 text-sm text-muted-foreground">{world.tagline}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
