import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { WorldMainTabs } from "@/components/WorldMainTabs";
import { NewEventForm } from "./NewEventForm";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/worlds/[slug]/events/new">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: world } = await supabase.from("worlds").select("name").eq("slug", slug).maybeSingle();
  if (!world) return {};
  return { title: `發布報名公告 ｜ ${world.name}` };
}

export default async function NewEventPage({
  params,
}: PageProps<"/dashboard/worlds/[slug]/events/new">) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!world) notFound();

  const { data: isStaff } = await supabase.rpc("is_world_staff", { p_world_id: world.id });
  if (!isStaff) notFound();

  const { data: fields } = await supabase
    .from("world_character_fields")
    .select("id, label, field_type, options, character_type")
    .eq("world_id", world.id)
    .or("character_type.is.null,character_type.eq.pc")
    .order("order_index");

  return (
    <div>
      <WorldMainTabs basePath={`/dashboard/worlds/${world.slug}`} />
      <h1 className="mt-4 text-xl font-semibold">發布報名公告</h1>
      <NewEventForm worldId={world.id} worldSlug={world.slug} fields={fields ?? []} />
    </div>
  );
}
