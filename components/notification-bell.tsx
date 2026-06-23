"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import { useProcessStore } from "@/store/process-store";

export function NotificationBell() {
  const profileId = useAuthStore((state) => state.profile?.id);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const items = useNotificationStore((state) => state.items);
  const loading = useNotificationStore((state) => state.loading);
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const kanbanNewTaskCount = useProcessStore((state) => state.kanbanNewTaskCount);
  const kanbanOverdueTaskCount = useProcessStore((state) => state.kanbanOverdueTaskCount);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const kanbanAlertCount = kanbanNewTaskCount + kanbanOverdueTaskCount;
  const badgeCount = unreadCount + kanbanAlertCount;
  const hasKanbanAlerts = kanbanAlertCount > 0;

  const refreshBadge = useCallback(() => {
    if (!profileId) {
      return;
    }
    void refreshUnreadCount(profileId);
    void refreshKanbanNewTaskCount();
    void refreshKanbanOverdueTaskCount();
    if (open) {
      void loadNotifications(profileId);
    }
  }, [
    loadNotifications,
    open,
    profileId,
    refreshKanbanNewTaskCount,
    refreshKanbanOverdueTaskCount,
    refreshUnreadCount,
  ]);

  useEffect(() => {
    if (!profileId) {
      return;
    }
    refreshBadge();
  }, [profileId, refreshBadge]);

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
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-card">
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
          <div className="max-h-[min(28rem,70vh)] overflow-y-auto overscroll-contain">
            {hasKanbanAlerts ? (
              <div className="border-b border-border/60 bg-surface-muted/20">
                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Tablice wdrożeń
                </p>
                {kanbanNewTaskCount > 0 ? (
                  <Link
                    href="/tablice-wdrozen"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-300">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">Nowe zgłoszenia klienta</p>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                        {kanbanNewTaskCount === 1
                          ? "1 task oczekuje na przejrzenie przez zespół."
                          : `${kanbanNewTaskCount} tasków oczekuje na przejrzenie przez zespół.`}
                      </p>
                    </span>
                  </Link>
                ) : null}
                {kanbanOverdueTaskCount > 0 ? (
                  <Link
                    href="/tablice-wdrozen"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">Przeterminowane taski</p>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                        {kanbanOverdueTaskCount === 1
                          ? "1 task ma przekroczony termin realizacji."
                          : `${kanbanOverdueTaskCount} tasków ma przekroczony termin realizacji.`}
                      </p>
                    </span>
                  </Link>
                ) : null}
              </div>
            ) : null}

            {loading ? (
              <p className="px-4 py-6 text-sm text-muted">Ładowanie…</p>
            ) : items.length === 0 && !hasKanbanAlerts ? (
              <p className="px-4 py-6 text-sm text-muted">Brak powiadomień.</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-4 text-xs text-muted">Brak innych powiadomień.</p>
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
                  <p className="break-words text-sm font-medium leading-snug text-foreground">{item.title}</p>
                  {item.body ? (
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted">
                      {item.body}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-[10px] text-muted">{formatDate(item.createdAt)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
