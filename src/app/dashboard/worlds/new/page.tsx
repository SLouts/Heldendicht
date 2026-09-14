"use client";

import { useActionState } from "react";
import { createWorld } from "@/lib/actions/worlds";

export default function NewWorldPage() {
  const [state, formAction, pending] = useActionState(createWorld, undefined);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">建立世界觀</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        建立後你會自動成為這個世界觀的主辦(admin)。
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            世界觀名稱
          </label>
          <input
            id="name"
            name="name"
            required
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
          {state && "fieldErrors" in state && state.fieldErrors.name && (
            <p className="text-sm text-danger">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="slug" className="text-sm font-medium">
            slug(網址用,例如 my-world)
          </label>
          <input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9-]+"
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
          />
          {state && "fieldErrors" in state && state.fieldErrors.slug && (
            <p className="text-sm text-danger">{state.fieldErrors.slug[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tagline" className="text-sm font-medium">
            一句話簡介(選填)
          </label>
          <input
            id="tagline"
            name="tagline"
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium">
            詳細介紹(選填)
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
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
            defaultValue={3}
            className="w-32 rounded-lg border border-border bg-surface px-3 py-2"
          />
          {state && "fieldErrors" in state && state.fieldErrors.defaultPcQuota && (
            <p className="text-sm text-danger">
              {state.fieldErrors.defaultPcQuota[0]}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublic" defaultChecked />
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
          {pending ? "建立中…" : "建立世界觀"}
        </button>
      </form>
    </div>
  );
}
