"use client";

import { useActionState, useState } from "react";
import { updateSiteSettings } from "@/lib/actions/siteSettings";
import { MarkdownText } from "@/components/MarkdownText";

type Props = {
  heroTitle: string;
  heroTagline: string;
  disclaimerContent: string;
  ctaHeading: string;
  ctaDescriptionGuest: string;
  ctaDescriptionMember: string;
  staffContactUsername: string;
};

/**
 * 首頁文案編輯——右側即時預覽照抄 `(site)/page.tsx` Hero 區塊的排版
 * (置中、max-w-2xl、text-xs 公告文字),讓站務改之前能先看到實際
 * 呈現效果,跟 NewCharacterForm/NewNodeForm 的「即時預覽」是同一套慣例。
 * 「平台特色」卡片清單在這個表單之外,見同一頁下方的 OrderedContentEditor
 * (siteFeatureCards.ts)。
 */
export function SiteSettingsForm({
  heroTitle: initialHeroTitle,
  heroTagline: initialHeroTagline,
  disclaimerContent: initialDisclaimerContent,
  ctaHeading: initialCtaHeading,
  ctaDescriptionGuest: initialCtaDescriptionGuest,
  ctaDescriptionMember: initialCtaDescriptionMember,
  staffContactUsername: initialStaffContactUsername,
}: Props) {
  const [state, formAction, pending] = useActionState(updateSiteSettings, undefined);
  const [heroTitle, setHeroTitle] = useState(initialHeroTitle);
  const [heroTagline, setHeroTagline] = useState(initialHeroTagline);
  const [disclaimerContent, setDisclaimerContent] = useState(initialDisclaimerContent);
  const [ctaHeading, setCtaHeading] = useState(initialCtaHeading);
  const [ctaDescriptionGuest, setCtaDescriptionGuest] = useState(initialCtaDescriptionGuest);
  const [ctaDescriptionMember, setCtaDescriptionMember] = useState(initialCtaDescriptionMember);
  const [staffContactUsername, setStaffContactUsername] = useState(initialStaffContactUsername);

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

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground">站務聯絡人</h2>

          <div className="flex flex-col gap-1">
            <label htmlFor="staffContactUsername" className="text-sm font-medium">
              全站頁尾「聯繫站務人員」要連去的帳號(網址代號)
            </label>
            <input
              id="staffContactUsername"
              name="staffContactUsername"
              placeholder="例如 peilinmu"
              value={staffContactUsername}
              onChange={(e) => setStaffContactUsername(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2"
            />
            <p className="text-xs text-muted-foreground">
              留空代表還沒設定,連結會顯示 404。填這個人的網址代號(個人頁面網址
              /u/後面那一段),不是暱稱。
            </p>
            {fieldError("staffContactUsername") && (
              <p className="text-sm text-danger">{fieldError("staffContactUsername")}</p>
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

          <div className="rounded-lg border border-border bg-surface p-4 text-center">
            <h2 className="text-sm font-semibold">{ctaHeading}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{ctaDescriptionGuest}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
