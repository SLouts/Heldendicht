"use client";

import { useActionState, useRef, useState } from "react";
import {
  createCharacterField,
  updateCharacterField,
  deleteCharacterField,
  moveCharacterField,
} from "@/lib/actions/characterFields";

export type CharacterFieldItem = {
  id: string;
  label: string;
  character_type: "pc" | "npc" | null;
};

const TYPE_LABEL: Record<"pc" | "npc" | "", string> = {
  "": "共用(PC/NPC 都適用)",
  pc: "只有 PC",
  npc: "只有 NPC",
};

/**
 * 角色必填欄位(world_character_fields)專用的編輯清單——跟補充區塊範本
 * (world_section_templates)共用的 OrderedLabelEditor 結構很像,但這裡
 * 多一個「共用/只有 PC/只有 NPC」的選擇器,是這張表獨有的需求,所以不
 * 硬塞進那個共用元件裡增加它唯一使用者不需要的複雜度,獨立成自己的檔案。
 */
export function CharacterFieldsEditor({
  worldId,
  worldSlug,
  items,
}: {
  worldId: string;
  worldSlug: string;
  items: CharacterFieldItem[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createCharacterField,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <CharacterFieldRow
            key={item.id}
            item={item}
            index={i}
            total={items.length}
            worldId={worldId}
            worldSlug={worldSlug}
          />
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">還沒有設定任何必填欄位。</p>
        )}
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await createAction(formData);
          formRef.current?.reset();
        }}
        className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="worldId" value={worldId} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <div className="flex flex-col gap-1">
          <label htmlFor="new-field-label" className="text-sm font-medium">
            新增欄位
          </label>
          <input
            id="new-field-label"
            name="label"
            placeholder="例如「性別」"
            required
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="new-field-type" className="text-sm font-medium">
            適用對象
          </label>
          <select
            id="new-field-type"
            name="characterType"
            defaultValue=""
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          >
            <option value="">{TYPE_LABEL[""]}</option>
            <option value="pc">{TYPE_LABEL.pc}</option>
            <option value="npc">{TYPE_LABEL.npc}</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={createPending}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {createPending ? "新增中…" : "+ 新增"}
        </button>
        {createState && "error" in createState && (
          <p className="w-full text-sm text-danger">{createState.error}</p>
        )}
        {createState && "fieldErrors" in createState && (
          <p className="w-full text-sm text-danger">
            {Object.values(createState.fieldErrors).flat()[0]}
          </p>
        )}
      </form>
    </div>
  );
}

function CharacterFieldRow({
  item,
  index,
  total,
  worldId,
  worldSlug,
}: {
  item: CharacterFieldItem;
  index: number;
  total: number;
  worldId: string;
  worldSlug: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateCharacterField,
    undefined,
  );

  if (isEditing) {
    return (
      <form
        action={async (formData) => {
          await formAction(formData);
          setIsEditing(false);
        }}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2"
      >
        <input type="hidden" name="fieldId" value={item.id} />
        <input type="hidden" name="worldSlug" value={worldSlug} />
        <input
          name="label"
          defaultValue={item.label}
          required
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
        />
        <select
          name="characterType"
          defaultValue={item.character_type ?? ""}
          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
        >
          <option value="">{TYPE_LABEL[""]}</option>
          <option value="pc">{TYPE_LABEL.pc}</option>
          <option value="npc">{TYPE_LABEL.npc}</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "儲存中…" : "儲存"}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-sm text-muted-foreground underline"
        >
          取消
        </button>
        {state && "error" in state && (
          <p className="w-full text-sm text-danger">{state.error}</p>
        )}
        {state && "fieldErrors" in state && (
          <p className="w-full text-sm text-danger">
            {Object.values(state.fieldErrors).flat()[0]}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-2">
      <span className="font-medium">{item.label}</span>
      <span className="rounded-full bg-badge-neutral-bg px-2 py-0.5 text-xs text-badge-neutral-fg">
        {TYPE_LABEL[item.character_type ?? ""]}
      </span>
      <div className="ml-auto flex gap-3 text-xs">
        <button type="button" onClick={() => setIsEditing(true)} className="underline">
          編輯
        </button>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => void moveCharacterField(item.id, worldId, worldSlug, "up")}
          className="underline disabled:opacity-30"
        >
          上移
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => void moveCharacterField(item.id, worldId, worldSlug, "down")}
          className="underline disabled:opacity-30"
        >
          下移
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                `確定要刪除「${item.label}」這個必填欄位嗎?已經填過的角色資料也會一併清掉。`,
              )
            ) {
              void deleteCharacterField(item.id, worldSlug);
            }
          }}
          className="text-danger underline"
        >
          刪除
        </button>
      </div>
    </div>
  );
}
