"use client";

import Link from "next/link";
import { useState } from "react";

type Step = { href: string; title: string; description: string };

/**
 * 世界觀建立完成後的「接下來可以做什麼」指引——只在剛建立完成那次導向
 * (page.tsx 判斷 searchParams.new === "1")顯示,純前端關閉(不用寫回
 * 資料庫記「看過了」,反正這個參數只會在建立完成那一次出現,離開這個
 * 網址之後就不會再帶著)。
 */
export function NewWorldOnboarding({ worldSlug }: { worldSlug: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const steps: Step[] = [
    {
      href: `/dashboard/worlds/${worldSlug}/settings`,
      title: "補上世界觀基本資料",
      description: "上傳橫幅/Icon、寫詳細介紹,讓首頁看起來更完整。",
    },
    {
      href: `/dashboard/worlds/${worldSlug}/character-fields`,
      title: "設定角色必填欄位",
      description: "例如性別、生日、種族——玩家建立角色時都要填,PC/NPC 可以分開設定。",
    },
    {
      href: `/dashboard/worlds/${worldSlug}/rules`,
      title: "寫下世界觀規則",
      description: "投稿規範、授權或權利聲明,會顯示在世界觀首頁的「企劃規則與手冊」分頁。",
    },
    {
      href: `/dashboard/worlds/${worldSlug}/categories`,
      title: "規劃內容分類",
      description: "幫條目分組導覽,例如「宗門」「地誌」——不分類的話會照節點類型自動分組。",
    },
    {
      href: `/dashboard/worlds/${worldSlug}/members`,
      title: "邀請成員加入",
      description: "邀請共筆的夥伴,設定各自是編輯還是一般成員。",
    },
    {
      href: `/dashboard/worlds/${worldSlug}/characters/new`,
      title: "建立第一個角色或條目",
      description: "先寫一個角色或地點,世界觀首頁就不會是空的。",
    },
  ];

  return (
    <section className="mt-6 rounded-lg border border-primary/40 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">🎉 世界觀建立完成,接下來可以:</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            以下都是選填,隨時可以之後再回來補——不會擋住任何人瀏覽或投稿。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="shrink-0 text-sm text-muted-foreground underline"
        >
          關閉
        </button>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="block h-full rounded-lg border border-border bg-surface p-3 hover:bg-muted"
            >
              <p className="text-sm font-medium">{step.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
