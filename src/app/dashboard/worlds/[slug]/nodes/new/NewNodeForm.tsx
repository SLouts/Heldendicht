"use client";

import { useActionState, useState } from "react";
import { createNode } from "@/lib/actions/nodes";
import { CategorySelectOptions } from "@/components/CategorySelectOptions";
import { DynamicFieldInput } from "@/components/DynamicFieldInput";

type CategoryFieldOption = {
  id: string;
  label: string;
  isRequired: boolean;
  fieldType: "text" | "select" | "range";
  options: string[];
  rangeMin: number | null;
  rangeMax: number | null;
  rangeStep: number | null;
};

export function NewNodeForm({
  worldId,
  worldSlug,
  categories,
  fieldsByCategory,
  isStaff,
}: {
  worldId: string;
  worldSlug: string;
  categories: { id: string; name: string; accepts_submissions: boolean; parent_id: string | null }[];
  fieldsByCategory: Record<string, CategoryFieldOption[]>;
  isStaff: boolean;
}) {
  const [state, formAction, pending] = useActionState(createNode, undefined);
  const [categoryId, setCategoryId] = useState("");
  const categoryFields = fieldsByCategory[categoryId] ?? [];

  // 一般成員一定要選一個開放投稿的分類才能建立節點(見 guard_node_category
  // trigger),不能不選——如果這個世界觀連一個開放投稿的分類都沒有,一般
  // 成員在這裡就直接建立不了,顯示提示而不是讓他們送出去被資料庫擋下來。
  if (!isStaff && categories.length === 0) {
    return (
      <p className="mt-6 max-w-xl rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
        目前沒有開放投稿的分類,暫時無法建立節點,請聯絡這個世界觀的主辦或編輯。
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex max-w-xl flex-col gap-4">
      <input type="hidden" name="worldId" value={worldId} />
      <input type="hidden" name="worldSlug" value={worldSlug} />

      <div className="flex flex-col gap-1">
        <label htmlFor="nodeType" className="text-sm font-medium">
          類型
        </label>
        <select
          id="nodeType"
          name="nodeType"
          defaultValue="location"
          className="w-40 rounded-lg border border-border bg-surface px-3 py-2"
        >
          <option value="location">地點</option>
          <option value="item">物產</option>
          <option value="faction">勢力</option>
          <option value="concept">概念</option>
          <option value="event">事件</option>
          <option value="article">文章</option>
        </select>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="categoryId" className="text-sm font-medium">
            分類{isStaff ? "(選填)" : ""}
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required={!isStaff}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-56 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <option value="" disabled={!isStaff}>
              {isStaff ? "不掛分類" : "請選擇分類"}
            </option>
            <CategorySelectOptions categories={categories} />
          </select>
          {!isStaff && (
            <p className="text-xs text-muted-foreground">
              一般成員建立節點一定要選一個開放投稿的分類。
            </p>
          )}
        </div>
      )}

      {categoryFields.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
          <p className="text-sm font-medium">這個分類要求填以下欄位</p>
          {categoryFields.map((f) => (
            <div key={f.id} className="flex flex-col gap-1">
              <label htmlFor={`field_${f.id}`} className="text-sm font-medium">
                {f.label}
                {f.isRequired ? (
                  <span className="ml-1 text-danger">*</span>
                ) : (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(選填)</span>
                )}
              </label>
              <DynamicFieldInput
                id={`field_${f.id}`}
                name={`field_${f.id}`}
                defaultValue=""
                required={f.isRequired}
                fieldType={f.fieldType}
                options={f.options}
                rangeMin={f.rangeMin}
                rangeMax={f.rangeMax}
                rangeStep={f.rangeStep}
                multiline
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          標題
        </label>
        <input
          id="title"
          name="title"
          required
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
        {state && "fieldErrors" in state && state.fieldErrors.title && (
          <p className="text-sm text-danger">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="content" className="text-sm font-medium">
          內文
        </label>
        <textarea
          id="content"
          name="content"
          rows={8}
          placeholder="可以用 [[名稱]] 建立 WikiLink"
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="editMode" className="text-sm font-medium">
          編輯權限
        </label>
        <select
          id="editMode"
          name="editMode"
          defaultValue="owner_only"
          className="w-56 rounded-lg border border-border bg-surface px-3 py-2"
        >
          <option value="owner_only">僅自己可改</option>
          <option value="collaborative">開放社群共筆</option>
        </select>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "建立中…" : "建立節點"}
      </button>
    </form>
  );
}
