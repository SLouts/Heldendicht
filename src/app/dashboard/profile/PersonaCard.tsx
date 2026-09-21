"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import {
  deletePersona,
  unlinkCharacterPersona,
  updatePersona,
  uploadPersonaAvatar,
  type PersonaField,
} from "@/lib/actions/personas";
import { PersonaFieldsEditor } from "./PersonaFieldsEditor";
import { NODE_STATUS_LABEL } from "@/lib/nodeTypeLabels";
import type { NodeStatus } from "@/lib/supabase/database.types";

export type PersonaLink = {
  nodeId: string;
  nodeSlug: string;
  title: string;
  worldSlug: string;
  worldName: string;
  status: NodeStatus;
};

export function PersonaCard({
  id,
  name,
  tagline,
  bio,
  fields,
  avatarUrl,
  links,
}: {
  id: string;
  name: string;
  tagline: string | null;
  bio: string | null;
  fields: PersonaField[];
  avatarUrl: string | null;
  links: PersonaLink[];
}) {
  const [detailsState, detailsAction, detailsPending] = useActionState(
    updatePersona,
    undefined,
  );
  const [avatarState, avatarAction, avatarPending] = useActionState(
    uploadPersonaAvatar,
    undefined,
  );
  const avatarFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row">
      <div className="flex flex-col items-center gap-2">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- public bucket 網址,無法用 next/image 白名單網域
          <img
            src={avatarUrl}
            alt={name}
            className="h-20 w-20 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="h-20 w-20 rounded-full border border-border bg-muted" />
        )}
        <form
          ref={avatarFormRef}
          action={async (formData) => {
            await avatarAction(formData);
            avatarFormRef.current?.reset();
          }}
          className="flex flex-col items-center gap-1"
        >
          <input type="hidden" name="personaId" value={id} />
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp"
            className="w-32 text-xs"
          />
          <button
            type="submit"
            disabled={avatarPending}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
          >
            {avatarPending ? "上傳中…" : "換頭像"}
          </button>
          {avatarState && "error" in avatarState && (
            <p className="text-xs text-danger">{avatarState.error}</p>
          )}
        </form>
      </div>

      <div className="flex-1">
        <form action={detailsAction} className="flex flex-col gap-2">
          <input type="hidden" name="personaId" value={id} />
          <input
            name="name"
            defaultValue={name}
            required
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium"
          />
          <input
            name="tagline"
            defaultValue={tagline ?? ""}
            placeholder="一句話介紹(選填)"
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm italic"
          />
          <PersonaFieldsEditor initialFields={fields} />
          <textarea
            name="bio"
            defaultValue={bio ?? ""}
            rows={3}
            placeholder="這隻角色的簡介…"
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          {detailsState && "error" in detailsState && (
            <p className="text-sm text-danger">{detailsState.error}</p>
          )}
          {detailsState && "fieldErrors" in detailsState && (
            <p className="text-sm text-danger">
              {Object.values(detailsState.fieldErrors).flat()[0]}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={detailsPending}
              className="w-fit rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
            >
              {detailsPending ? "儲存中…" : "儲存"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`確定要刪除「${name}」這個跨世界觀角色身分嗎?`)) {
                  void deletePersona(id);
                }
              }}
              className="text-sm text-danger underline"
            >
              刪除
            </button>
          </div>
        </form>

        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            出現在這些世界觀
          </p>
          {links.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              還沒有連結任何世界觀的角色節點——到該角色的節點頁面選擇連結到這個身分。
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {links.map((link) => (
                <li
                  key={link.nodeId}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <Link
                    href={`/dashboard/worlds/${link.worldSlug}/nodes/${link.nodeSlug}`}
                    className="hover:underline"
                  >
                    {link.worldName} ·{link.title}
                  </Link>
                  {link.status !== "approved" && (
                    <span className="rounded-full bg-badge-pending-bg px-2 py-0.5 text-xs text-badge-pending-fg">
                      {NODE_STATUS_LABEL[link.status]}
                    </span>
                  )}
                  <form
                    action={unlinkCharacterPersona.bind(
                      null,
                      link.nodeId,
                      link.worldSlug,
                      link.nodeSlug,
                    )}
                  >
                    <button type="submit" className="text-xs text-danger underline">
                      解除連結
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
