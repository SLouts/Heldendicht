"use client";

import { useActionState, useState } from "react";
import { updateSiteSettings } from "@/lib/actions/siteSettings";
import { MarkdownText } from "@/components/MarkdownText";

/**
 * 首頁文案編輯——右側即時預覽照抄 `(site)/page.tsx` Hero 區塊的排版
 * (置中、max-w-2xl、text-xs 公告文字),讓站務改之前能先看到實際
 * 呈現效果,跟 NewCharacterForm/NewNodeForm 的「即時預覽」是同一套慣例。
 */
export function SiteSettingsForm({
  heroTitle: initialHeroTitle,
  heroTagline: initialHeroTagline,
  disclaimerContent: initialDisclaimerContent,
}: {
  heroTitle: string;
  heroTagline: string;
  disclaimerContent: string;
}) {
  const [state, formAction, pending] = useActionState(updateSiteSettings, undefined);
  const [heroTitle, setHeroTitle] = useState(initialHeroTitle);
  const [heroTagline, setHeroTagline] = useState(initialHeroTagline);
  const [disclaimerContent, setDisclaimerContent] = useState(initialDisclaimerContent);

  return (
    <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
      <form action={formAction} className="flex max-w-xl flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="heroTitle" className="text-sm font-medium">
            標題
          </label>
          <input
            id="heroTitle"
            name="heroTitle"
            required
            value={heroTitle}
            onChange={(e) => setHeroTitle(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
          {state && "fieldErrors" in state && state.fieldErrors.heroTitle && (
            <p className="text-sm text-danger">{state.fieldErrors.heroTitle[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="heroTagline" className="text-sm font-medium">
            標語
          </label>
          <textarea
            id="heroTagline"
            name="heroTagline"
            required
            rows={2}
            value={heroTagline}
            onChange={(e) => setHeroTagline(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2"
          />
          {state && "fieldErrors" in state && state.fieldErrors.heroTagline && (
            <p className="text-sm text-danger">{state.fieldErrors.heroTagline[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="disclaimerContent" className="text-sm font-medium">
            公告文字
          </label>
          <textarea
            id="disclaimerContent"
            name="disclaimerContent"
            required
            rows={6}
            value={disclaimerContent}
            onChange={(e) => setDisclaimerContent(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            支援簡易 markdown:[文字](/站內路徑)、[文字](https://外部網址)、[文字](mailto:信箱)
            連結、**粗體**、*斜體*。
          </p>
          {state && "fieldErrors" in state && state.fieldErrors.disclaimerContent && (
            <p className="text-sm text-danger">{state.fieldErrors.disclaimerContent[0]}</p>
          )}
        </div>

        {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "儲存中…" : "儲存"}
        </button>
      </form>

      <aside className="w-full shrink-0 lg:w-96">
        <p className="text-xs font-medium text-muted-foreground">即時預覽</p>
        <div className="mt-2 rounded-lg border border-border bg-background p-6 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">{heroTitle}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{heroTagline}</p>
          <div className="mx-auto mt-3 max-w-2xl text-xs text-muted-foreground [&_p]:mt-0 [&_p]:text-xs">
            <MarkdownText text={disclaimerContent} />
          </div>
        </div>
      </aside>
    </div>
  );
}
