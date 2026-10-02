"use client";

import { useActionState, useState } from "react";
import { updateSiteSettings } from "@/lib/actions/siteSettings";
import { MarkdownText } from "@/components/MarkdownText";

type Props = {
  heroTitle: string;
  heroTagline: string;
  disclaimerContent: string;
  feature1Title: string;
  feature1Description: string;
  feature2Title: string;
  feature2Description: string;
  feature3Title: string;
  feature3Description: string;
  ctaHeading: string;
  ctaDescriptionGuest: string;
  ctaDescriptionMember: string;
};

/**
 * 首頁文案編輯——右側即時預覽照抄 `(site)/page.tsx` 的排版(Hero 置中
 * 區塊、三張特色卡片、CTA 區塊),讓站務改之前能先看到實際呈現效果,
 * 跟 NewCharacterForm/NewNodeForm 的「即時預覽」是同一套慣例。
 *
 * CTA 區塊的訪客/會員說明文字分開編輯,但預覽固定顯示「訪客會看到的
 * 版本」——站務編輯當下未必是最適合判斷「會員版本」畫面的情境,固定
 * 顯示訪客版本比較符合多數訪問者會看到的樣子。
 */
export function SiteSettingsForm({
  heroTitle: initialHeroTitle,
  heroTagline: initialHeroTagline,
  disclaimerContent: initialDisclaimerContent,
  feature1Title: initialFeature1Title,
  feature1Description: initialFeature1Description,
  feature2Title: initialFeature2Title,
  feature2Description: initialFeature2Description,
  feature3Title: initialFeature3Title,
  feature3Description: initialFeature3Description,
  ctaHeading: initialCtaHeading,
  ctaDescriptionGuest: initialCtaDescriptionGuest,
  ctaDescriptionMember: initialCtaDescriptionMember,
}: Props) {
  const [state, formAction, pending] = useActionState(updateSiteSettings, undefined);
  const [heroTitle, setHeroTitle] = useState(initialHeroTitle);
  const [heroTagline, setHeroTagline] = useState(initialHeroTagline);
  const [disclaimerContent, setDisclaimerContent] = useState(initialDisclaimerContent);
  const [feature1Title, setFeature1Title] = useState(initialFeature1Title);
  const [feature1Description, setFeature1Description] = useState(initialFeature1Description);
  const [feature2Title, setFeature2Title] = useState(initialFeature2Title);
  const [feature2Description, setFeature2Description] = useState(initialFeature2Description);
  const [feature3Title, setFeature3Title] = useState(initialFeature3Title);
  const [feature3Description, setFeature3Description] = useState(initialFeature3Description);
  const [ctaHeading, setCtaHeading] = useState(initialCtaHeading);
  const [ctaDescriptionGuest, setCtaDescriptionGuest] = useState(initialCtaDescriptionGuest);
  const [ctaDescriptionMember, setCtaDescriptionMember] = useState(initialCtaDescriptionMember);

  const fieldError = (key: string) =>
    state && "fieldErrors" in state ? state.fieldErrors[key]?.[0] : undefined;

  return (
    <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
      <form action={formAction} className="flex max-w-xl flex-1 flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Hero 區塊</h2>

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
            {fieldError("heroTitle") && <p className="text-sm text-danger">{fieldError("heroTitle")}</p>}
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
            {fieldError("heroTagline") && (
              <p className="text-sm text-danger">{fieldError("heroTagline")}</p>
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
            {fieldError("disclaimerContent") && (
              <p className="text-sm text-danger">{fieldError("disclaimerContent")}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground">平台特色(三張卡片)</h2>

          {(
            [
              {
                key: "feature1",
                title: feature1Title,
                setTitle: setFeature1Title,
                description: feature1Description,
                setDescription: setFeature1Description,
              },
              {
                key: "feature2",
                title: feature2Title,
                setTitle: setFeature2Title,
                description: feature2Description,
                setDescription: setFeature2Description,
              },
              {
                key: "feature3",
                title: feature3Title,
                setTitle: setFeature3Title,
                description: feature3Description,
                setDescription: setFeature3Description,
              },
            ] as const
          ).map((f, i) => (
            <div key={f.key} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">第 {i + 1} 張卡片</p>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${f.key}Title`} className="text-sm font-medium">
                  標題
                </label>
                <input
                  id={`${f.key}Title`}
                  name={`${f.key}Title`}
                  required
                  value={f.title}
                  onChange={(e) => f.setTitle(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2"
                />
                {fieldError(`${f.key}Title`) && (
                  <p className="text-sm text-danger">{fieldError(`${f.key}Title`)}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${f.key}Description`} className="text-sm font-medium">
                  說明文字
                </label>
                <textarea
                  id={`${f.key}Description`}
                  name={`${f.key}Description`}
                  required
                  rows={3}
                  value={f.description}
                  onChange={(e) => f.setDescription(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
                {fieldError(`${f.key}Description`) && (
                  <p className="text-sm text-danger">{fieldError(`${f.key}Description`)}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground">底部 CTA 區塊</h2>

          <div className="flex flex-col gap-1">
            <label htmlFor="ctaHeading" className="text-sm font-medium">
              標題
            </label>
            <input
              id="ctaHeading"
              name="ctaHeading"
              required
              value={ctaHeading}
              onChange={(e) => setCtaHeading(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2"
            />
            {fieldError("ctaHeading") && <p className="text-sm text-danger">{fieldError("ctaHeading")}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="ctaDescriptionGuest" className="text-sm font-medium">
              說明文字(未登入訪客看到的版本)
            </label>
            <textarea
              id="ctaDescriptionGuest"
              name="ctaDescriptionGuest"
              required
              rows={2}
              value={ctaDescriptionGuest}
              onChange={(e) => setCtaDescriptionGuest(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            {fieldError("ctaDescriptionGuest") && (
              <p className="text-sm text-danger">{fieldError("ctaDescriptionGuest")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="ctaDescriptionMember" className="text-sm font-medium">
              說明文字(已登入會員看到的版本)
            </label>
            <textarea
              id="ctaDescriptionMember"
              name="ctaDescriptionMember"
              required
              rows={2}
              value={ctaDescriptionMember}
              onChange={(e) => setCtaDescriptionMember(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            {fieldError("ctaDescriptionMember") && (
              <p className="text-sm text-danger">{fieldError("ctaDescriptionMember")}</p>
            )}
          </div>
        </div>

        {state && "error" in state && <p className="text-sm text-danger">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "儲存中…" : "儲存"}
        </button>
      </form>

      <aside className="w-full shrink-0 lg:w-96">
        <p className="text-xs font-medium text-muted-foreground">即時預覽</p>
        <div className="mt-2 flex flex-col gap-4 rounded-lg border border-border bg-background p-6">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">{heroTitle}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{heroTagline}</p>
            <div className="mx-auto mt-3 max-w-2xl text-xs text-muted-foreground [&_p]:mt-0 [&_p]:text-xs">
              <MarkdownText text={disclaimerContent} />
            </div>
          </div>

          <div className="grid gap-2 border-t border-border pt-4 sm:grid-cols-1">
            {[
              { title: feature1Title, description: feature1Description },
              { title: feature2Title, description: feature2Description },
              { title: feature3Title, description: feature3Description },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-border bg-surface p-3">
                <h3 className="font-display text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-surface p-4 text-center">
            <h2 className="text-sm font-semibold">{ctaHeading}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{ctaDescriptionGuest}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
