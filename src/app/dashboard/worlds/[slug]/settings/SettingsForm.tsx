"use client";

import { useActionState } from "react";
import { updateWorldSettings } from "@/lib/actions/worlds";

export function SettingsForm({
  world,
}: {
  world: {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    description: string | null;
    default_pc_quota: number;
    is_public: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateWorldSettings,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 flex max-w-xl flex-col gap-4">
      <input type="hidden" name="worldId" value={world.id} />
      <input type="hidden" name="worldSlug" value={world.slug} />

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          世界觀名稱
        </label>
        <input
          id="name"
          name="name"
          defaultValue={world.name}
          required
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tagline" className="text-sm font-medium">
          一句話簡介
        </label>
        <input
          id="tagline"
          name="tagline"
          defaultValue={world.tagline ?? ""}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          詳細介紹
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={world.description ?? ""}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="defaultPcQuota" className="text-sm font-medium">
          每人 PC 角色配額預設值
        </label>
        <input
          id="defaultPcQuota"
          name="defaultPcQuota"
          type="number"
          min={0}
          defaultValue={world.default_pc_quota}
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={world.is_public}
        />
        公開(訪客不登入也能看到企劃介紹)
      </label>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "儲存中…" : "儲存設定"}
      </button>
    </form>
  );
}
