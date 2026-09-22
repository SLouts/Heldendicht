"use client";

import { useActionState } from "react";
import { createRelationship } from "@/lib/actions/relationships";

export function NewRelationshipForm({
  worldId,
  worldSlug,
  nodes,
}: {
  worldId: string;
  worldSlug: string;
  nodes: { id: string; title: string; node_type: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createRelationship,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 flex max-w-xl flex-col gap-4">
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="nodeAId" className="text-sm font-medium">
            A 端
          </label>
          <select
            id="nodeAId"
            name="nodeAId"
            required
            defaultValue=""
            className="rounded-lg border border-border bg-surface px-3 py-2"
          >
            <option value="" disabled>
              選擇節點
            </option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}({node.node_type})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="nodeBId" className="text-sm font-medium">
            B 端
          </label>
          <select
            id="nodeBId"
            name="nodeBId"
            required
            defaultValue=""
            className="rounded-lg border border-border bg-surface px-3 py-2"
          >
            <option value="" disabled>
              選擇節點
            </option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}({node.node_type})
              </option>
            ))}
          </select>
        </div>
      </div>
      {state && "fieldErrors" in state && state.fieldErrors.nodeBId && (
        <p className="text-sm text-danger">{state.fieldErrors.nodeBId[0]}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="label" className="text-sm font-medium">
            A → B 稱呼(例如「戀人」)
          </label>
          <input
            id="label"
            name="label"
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="labelReverse" className="text-sm font-medium">
            B → A 稱呼(選填,不對稱關係才需要)
          </label>
          <input
            id="labelReverse"
            name="labelReverse"
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          描述(選填)
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">方向性</span>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="direction" value="bi" defaultChecked />
          雙向(A、B 兩端的角色擁有者都能編輯這條關係線)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="direction" value="uni" />
          單向(只有 A 端的角色擁有者能編輯,B 端不行)
        </label>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "建立中…" : "建立關係線"}
      </button>
    </form>
  );
}
