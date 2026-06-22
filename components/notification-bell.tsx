"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";

export function NotificationBell() {
  const profileId = useAuthStore((state) => state.profile?.id);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const items = useNotificationStore((state) => state.items);
  const loading = useNotificationStore((state) => state.loading);
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileId) {
      return;
    }
    void refreshUnreadCount(profileId);
  }, [profileId, refreshUnreadCount]);

  useEffect(() => {
    if (!open || !profileId) {
      return;
    }
    void loadNotifications(profileId);
  }, [loadNotifications, open, profileId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!profileId) {
    return null;
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="relative"
        onClick={() => setOpen((value) => !value)}
        aria-label="Powiadomienia"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-card">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Powiadomienia</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs text-accent hover:underline"
                onClick={() => void markAllRead(profileId)}
              >
                Oznacz wszystkie
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-muted">Ładowanie…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">Brak powiadomień.</p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.linkUrl ?? "/tablice-wdrozen"}
                  onClick={() => {
                    if (!item.readAt) {
                      void markRead(profileId, item.id);
                    }
                    setOpen(false);
                  }}
                  className={cn(
                    "block border-b border-border/50 px-4 py-3 transition hover:bg-surface-muted/30",
                    !item.readAt && "bg-accent/5",
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.body ? <p className="mt-1 text-xs text-muted line-clamp-2">{item.body}</p> : null}
                  <p className="mt-1 text-[10px] text-muted">{formatDate(item.createdAt)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
