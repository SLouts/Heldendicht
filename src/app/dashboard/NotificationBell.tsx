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
        text: `你追蹤的 ${n.actorLabel} 加入了新的世界觀`,
        href: n.actorUsername ? `/u/${n.actorUsername}` : null,
      };
  }
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg px-2 py-1.5 text-sm hover:bg-surface"
        aria-label="通知"
      >
        通知
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-badge-danger-bg px-1 text-[10px] font-medium text-badge-danger-fg">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-border bg-surface p-2 shadow-lg">
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

          {notifications.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              目前沒有通知。
            </p>
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
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("zh-TW")}
                    </span>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => {
                          if (!n.isRead) void markNotificationRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!n.isRead) void markNotificationRead(n.id);
                        }}
                      >
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
