"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";

export type NotificationItem = {
  id: string;
  type: "new_follower" | "followed_node" | "followed_world_join";
  isRead: boolean;
  createdAt: string;
  actorLabel: string;
  actorUsername: string | null;
  nodeTitle: string | null;
  worldSlug: string | null;
  worldName: string | null;
  nodeSlug: string | null;
};

function describe(n: NotificationItem): { text: string; href: string | null } {
  switch (n.type) {
    case "new_follower":
      return {
        text: `${n.actorLabel} 開始追蹤你`,
        href: n.actorUsername ? `/u/${n.actorUsername}` : null,
      };
    case "followed_node":
      return {
        text: `你追蹤的 ${n.actorLabel} 建立了新節點「${n.nodeTitle ?? ""}」`,
        href: n.worldSlug && n.nodeSlug ? `/worlds/${n.worldSlug}/nodes/${n.nodeSlug}` : null,
      };
    case "followed_world_join":
      return {
        text: `你追蹤的 ${n.actorLabel} 加入了世界觀「${n.worldName ?? "?"}」`,
        href: n.worldSlug
          ? `/worlds/${n.worldSlug}`
          : n.actorUsername
            ? `/u/${n.actorUsername}`
            : null,
      };
  }
}

export type ReviewWorldSummary = {
  worldSlug: string;
  worldName: string;
  pendingNodesCount: number;
  openReportsCount: number;
};

export function NotificationBell({
  notifications,
  unreadCount,
  reviewSummaries,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  reviewSummaries: ReviewWorldSummary[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reviewCount = reviewSummaries.reduce(
    (sum, w) => sum + w.pendingNodesCount + w.openReportsCount,
    0,
  );
  const badgeCount = unreadCount + reviewCount;
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function onNotifClick(n: NotificationItem) {
    if (!n.isRead) void markNotificationRead(n.id);
    close();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg px-2 py-1.5 text-sm hover:bg-surface"
        aria-label="通知"
      >
        通知
        {badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-badge-danger-bg px-1 text-[10px] font-medium text-badge-danger-fg">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="bell-variant bell-illuminated absolute right-0 z-20 mt-2 w-80 rounded-lg border border-border bg-surface p-2 shadow-lg">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-semibold">通知</span>
              {unreadCount > 0 && (
                <form action={markAllNotificationsRead}>
                  <button type="submit" className="text-xs underline">
                    全部標記已讀
                  </button>
                </form>
              )}
            </div>

            {reviewSummaries.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                {reviewSummaries.map((w) => (
                  <div
                    key={w.worldSlug}
                    className="flex flex-col gap-1 rounded-md bg-badge-pending-bg px-2 py-2 text-sm text-badge-pending-fg"
                  >
                    <span className="text-xs font-semibold opacity-80">{w.worldName}</span>
                    {w.pendingNodesCount > 0 && (
                      <Link href={`/dashboard/worlds/${w.worldSlug}`} onClick={close} className="hover:underline">
                        {w.pendingNodesCount} 個節點待審核
                      </Link>
                    )}
                    {w.openReportsCount > 0 && (
                      <Link
                        href={`/dashboard/worlds/${w.worldSlug}/reports`}
                        onClick={close}
                        className="hover:underline"
                      >
                        {w.openReportsCount} 個檢舉未結案
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}

            {notifications.length === 0 ? (
              reviewCount === 0 && (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">目前沒有通知。</p>
              )
            ) : (
              <ul className="mt-1 flex max-h-96 flex-col gap-0.5 overflow-y-auto">
                {notifications.map((n) => {
                  const { text, href } = describe(n);
                  const content = (
                    <div
                      className={
                        "flex flex-col gap-0.5 rounded-md px-2 py-2 text-sm transition hover:bg-muted" +
                        (n.isRead ? " text-muted-foreground" : "")
                      }
                    >
                      <span>{text}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString("zh-TW")}
                        {n.worldName && (
                          <span className="rounded-full bg-badge-neutral-bg px-1.5 py-0.5 text-badge-neutral-fg">
                            {n.worldName}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {href ? (
                        <Link href={href} onClick={() => onNotifClick(n)}>
                          {content}
                        </Link>
                      ) : (
                        <div role="button" tabIndex={0} onClick={() => onNotifClick(n)}>
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ---------- 劇本手稿:場記表 ---------- */}
          <div className="bell-variant bell-script absolute right-0 z-20 mt-2 w-96 border border-border bg-surface p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide">場記表</span>
              {unreadCount > 0 && (
                <form action={markAllNotificationsRead}>
                  <button type="submit" className="text-xs underline">
                    全部標記已讀
                  </button>
                </form>
              )}
            </div>
            {reviewCount === 0 && notifications.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">目前沒有通知。</p>
            ) : (
              <div className="mt-2 max-h-96 overflow-y-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="border-b border-border pb-2 pr-2 font-normal">類別</th>
                      <th className="border-b border-border pb-2 pr-2 font-normal">內容</th>
                      <th className="border-b border-border pb-2 pr-2 font-normal">世界觀</th>
                      <th className="border-b border-border pb-2 font-normal">狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewSummaries.flatMap((w) => [
                      w.pendingNodesCount > 0 && (
                        <tr key={`${w.worldSlug}-nodes`} className="cursor-pointer hover:bg-muted">
                          <td className="border-b border-border py-2 pr-2">審核</td>
                          <td className="border-b border-border py-2 pr-2">
                            <Link href={`/dashboard/worlds/${w.worldSlug}`} onClick={close}>
                              {w.pendingNodesCount} 個節點待審核
                            </Link>
                          </td>
                          <td className="border-b border-border py-2 pr-2 font-bold whitespace-nowrap">{w.worldName}</td>
                          <td className="border-b border-border py-2 text-primary">OPEN</td>
                        </tr>
                      ),
                      w.openReportsCount > 0 && (
                        <tr key={`${w.worldSlug}-reports`} className="cursor-pointer hover:bg-muted">
                          <td className="border-b border-border py-2 pr-2">審核</td>
                          <td className="border-b border-border py-2 pr-2">
                            <Link href={`/dashboard/worlds/${w.worldSlug}/reports`} onClick={close}>
                              {w.openReportsCount} 個檢舉未結案
                            </Link>
                          </td>
                          <td className="border-b border-border py-2 pr-2 font-bold whitespace-nowrap">{w.worldName}</td>
                          <td className="border-b border-border py-2 text-primary">OPEN</td>
                        </tr>
                      ),
                    ])}
                    {notifications.map((n) => {
                      const { text, href } = describe(n);
                      return (
                        <tr
                          key={n.id}
                          className={"cursor-pointer hover:bg-muted" + (n.isRead ? " text-muted-foreground" : "")}
                          onClick={() => onNotifClick(n)}
                        >
                          <td className="border-b border-border py-2 pr-2">追蹤</td>
                          <td className="border-b border-border py-2 pr-2">
                            {href ? <Link href={href}>{text}</Link> : text}
                          </td>
                          <td className="border-b border-border py-2 pr-2 font-bold whitespace-nowrap">
                            {n.worldName ?? "—"}
                          </td>
                          <td className="border-b border-border py-2">—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ---------- 田野筆記:標本標籤 ---------- */}
          <div className="bell-variant bell-field absolute right-0 z-20 mt-2 w-80 rounded border border-border bg-surface p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg">待複查</span>
              {unreadCount > 0 && (
                <form action={markAllNotificationsRead}>
                  <button type="submit" className="text-xs underline">
                    全部標記已讀
                  </button>
                </form>
              )}
            </div>
            {reviewCount === 0 && notifications.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">目前沒有通知。</p>
            ) : (
              <div className="mt-3 flex max-h-96 flex-col gap-3 overflow-y-auto">
                {reviewSummaries.map((w) => (
                  <div key={w.worldSlug} className="bell-field-tag">
                    <div className="bell-field-tag-k">採集地</div>
                    <div className="bell-field-tag-v">{w.worldName}</div>
                    {w.pendingNodesCount > 0 && (
                      <Link href={`/dashboard/worlds/${w.worldSlug}`} onClick={close} className="mt-1 block text-sm hover:underline">
                        {w.pendingNodesCount} 個節點待審核
                      </Link>
                    )}
                    {w.openReportsCount > 0 && (
                      <Link
                        href={`/dashboard/worlds/${w.worldSlug}/reports`}
                        onClick={close}
                        className="mt-1 block text-sm hover:underline"
                      >
                        {w.openReportsCount} 個檢舉未結案
                      </Link>
                    )}
                  </div>
                ))}
                {notifications.map((n) => {
                  const { text, href } = describe(n);
                  const inner = (
                    <div className={"bell-field-tag" + (n.isRead ? " opacity-60" : "")}>
                      <div className="bell-field-tag-k">追蹤動態</div>
                      <div className="bell-field-tag-v">{text}</div>
                      {n.worldName && <div className="mt-1 text-xs text-muted-foreground">來源 · {n.worldName}</div>}
                    </div>
                  );
                  return href ? (
                    <Link key={n.id} href={href} onClick={() => onNotifClick(n)}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id} role="button" tabIndex={0} onClick={() => onNotifClick(n)}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ---------- 角色卡牌:任務板 ---------- */}
          <div className="bell-variant bell-card absolute right-0 z-20 mt-2 w-80 rounded-lg border border-border bg-surface p-2 shadow-lg">
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-sm font-semibold">任務板</span>
              {unreadCount > 0 && (
                <form action={markAllNotificationsRead}>
                  <button type="submit" className="text-xs underline">
                    全部標記已讀
                  </button>
                </form>
              )}
            </div>
            {reviewCount === 0 && notifications.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">目前沒有通知。</p>
            ) : (
              <div className="mt-1 flex max-h-96 flex-col gap-2 overflow-y-auto">
                {reviewSummaries.map((w) => (
                  <div key={w.worldSlug} className="bell-card-quest">
                    <div className="bell-card-quest-bar">{w.worldName}</div>
                    <div className="bell-card-quest-body">
                      {w.pendingNodesCount > 0 && (
                        <Link
                          href={`/dashboard/worlds/${w.worldSlug}`}
                          onClick={close}
                          className="flex items-center justify-between hover:underline"
                        >
                          <span>節點待審核</span>
                          <b>{w.pendingNodesCount}</b>
                        </Link>
                      )}
                      {w.openReportsCount > 0 && (
                        <Link
                          href={`/dashboard/worlds/${w.worldSlug}/reports`}
                          onClick={close}
                          className="flex items-center justify-between hover:underline"
                        >
                          <span>檢舉未結案</span>
                          <b>{w.openReportsCount}</b>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.map((n) => {
                  const { text, href } = describe(n);
                  const inner = (
                    <div className={"bell-card-quest" + (n.isRead ? " opacity-60" : "")}>
                      <div className="bell-card-quest-bar">追蹤動態</div>
                      <div className="bell-card-quest-body">
                        <span>{text}</span>
                        {n.worldName && <span className="mt-1 block text-[11px] opacity-80">{n.worldName}</span>}
                      </div>
                    </div>
                  );
                  return href ? (
                    <Link key={n.id} href={href} onClick={() => onNotifClick(n)}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id} role="button" tabIndex={0} onClick={() => onNotifClick(n)}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ---------- 東方玄幻:手札 ---------- */}
          <div className="bell-variant bell-wuxia absolute right-0 z-20 mt-2 w-80 rounded border border-border bg-surface p-2 shadow-lg">
            <div className="flex items-center justify-between px-1 py-1">
              <span className="font-display text-lg">手札</span>
              {unreadCount > 0 && (
                <form action={markAllNotificationsRead}>
                  <button type="submit" className="text-xs underline">
                    全部標記已讀
                  </button>
                </form>
              )}
            </div>
            {reviewCount === 0 && notifications.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">目前沒有通知。</p>
            ) : (
              <div className="mt-1 flex max-h-96 flex-col gap-2 overflow-y-auto">
                {reviewSummaries.map((w) => (
                  <div key={w.worldSlug} className="bell-wuxia-note">
                    <span className="bell-wuxia-seal-badge">{w.worldName}</span>
                    {w.pendingNodesCount > 0 && (
                      <Link href={`/dashboard/worlds/${w.worldSlug}`} onClick={close} className="block text-sm hover:underline">
                        {w.pendingNodesCount} 個節點待審核
                      </Link>
                    )}
                    {w.openReportsCount > 0 && (
                      <Link
                        href={`/dashboard/worlds/${w.worldSlug}/reports`}
                        onClick={close}
                        className="block text-sm hover:underline"
                      >
                        {w.openReportsCount} 個檢舉未結案
                      </Link>
                    )}
                  </div>
                ))}
                {notifications.map((n) => {
                  const { text, href } = describe(n);
                  const inner = (
                    <div className={"bell-wuxia-note" + (n.isRead ? " opacity-60" : "")}>
                      {n.worldName && <span className="bell-wuxia-seal-badge">{n.worldName}</span>}
                      <div className="text-sm">{text}</div>
                    </div>
                  );
                  return href ? (
                    <Link key={n.id} href={href} onClick={() => onNotifClick(n)}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id} role="button" tabIndex={0} onClick={() => onNotifClick(n)}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
