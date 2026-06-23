"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, ClipboardCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavBadges } from "@/components/nav-badges";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useAgreementHubStore } from "@/store/agreement-hub-store";
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
  const agreementPendingCounts = useAgreementHubStore((state) => state.pendingCounts);
  const refreshAgreementPendingCounts = useAgreementHubStore((state) => state.refreshPendingCounts);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const kanbanAlertCount = kanbanNewTaskCount + kanbanOverdueTaskCount;
  const agreementAlertCount =
    agreementPendingCounts.pendingTeamApproval +
    agreementPendingCounts.pendingClientApproval +
    agreementPendingCounts.pendingOtherApproval;
  const newBadgeCount = kanbanNewTaskCount + unreadCount + agreementPendingCounts.pendingTeamApproval;
  const overdueBadgeCount = kanbanOverdueTaskCount;
  const hasKanbanAlerts = kanbanAlertCount > 0;
  const hasAgreementAlerts = agreementAlertCount > 0;
  const hasBadges = newBadgeCount > 0 || overdueBadgeCount > 0;

  const refreshBadge = useCallback(() => {
    if (!profileId) {
      return;
    }
    void refreshUnreadCount(profileId);
    void refreshKanbanNewTaskCount();
    void refreshKanbanOverdueTaskCount();
    void refreshAgreementPendingCounts({ force: true });
    if (open) {
      void loadNotifications(profileId);
    }
  }, [
    loadNotifications,
    open,
    profileId,
    refreshAgreementPendingCounts,
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
        className="relative shrink-0"
        onClick={() => setOpen((value) => !value)}
        aria-label="Powiadomienia"
      >
        <Bell className="h-4 w-4" />
        {hasBadges ? (
          <span className="absolute -right-2 -top-1.5">
            <NavBadges
              overdueCount={overdueBadgeCount}
              newCount={newBadgeCount}
              size="sm"
            />
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute right-0 z-50 mt-2 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-card",
            "top-full",
          )}
        >
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
            {hasAgreementAlerts ? (
              <div className="border-b border-border/60 bg-surface-muted/20">
                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Ustalenia
                </p>
                {agreementPendingCounts.pendingTeamApproval > 0 ? (
                  <Link
                    href="/tablice-wdrozen/ustalenia"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-200">
                      <ClipboardCheck className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          Do Twojej akceptacji (Administrator)
                        </p>
                        <NavBadges newCount={agreementPendingCounts.pendingTeamApproval} size="sm" />
                      </div>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                        {agreementPendingCounts.pendingTeamApproval === 1
                          ? "1 ustalenie czeka na akceptację zespołu."
                          : `${agreementPendingCounts.pendingTeamApproval} ustaleń czeka na akceptację zespołu.`}
                      </p>
                    </span>
                  </Link>
                ) : null}
                {agreementPendingCounts.pendingClientApproval > 0 ? (
                  <Link
                    href="/tablice-wdrozen/ustalenia"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-500/35 bg-sky-500/10 text-sky-200">
                      <ClipboardCheck className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Oczekuje na klienta</p>
                        <NavBadges newCount={agreementPendingCounts.pendingClientApproval} size="sm" />
                      </div>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                        {agreementPendingCounts.pendingClientApproval === 1
                          ? "1 ustalenie czeka na akceptację klienta."
                          : `${agreementPendingCounts.pendingClientApproval} ustaleń czeka na akceptację klienta.`}
                      </p>
                    </span>
                  </Link>
                ) : null}
                {agreementPendingCounts.pendingOtherApproval > 0 ? (
                  <Link
                    href="/tablice-wdrozen/ustalenia"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-500/35 bg-violet-500/10 text-violet-200">
                      <ClipboardCheck className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Inne role w procesie</p>
                        <NavBadges newCount={agreementPendingCounts.pendingOtherApproval} size="sm" />
                      </div>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                        {agreementPendingCounts.pendingOtherApproval === 1
                          ? "1 ustalenie czeka na akceptację dodatkowej roli."
                          : `${agreementPendingCounts.pendingOtherApproval} ustaleń czeka na akceptację dodatkowych ról.`}
                      </p>
                    </span>
                  </Link>
                ) : null}
              </div>
            ) : null}

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
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Nowe zgłoszenia klienta</p>
                        <NavBadges newCount={kanbanNewTaskCount} size="sm" />
                      </div>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Przeterminowane taski</p>
                        <NavBadges overdueCount={kanbanOverdueTaskCount} size="sm" />
                      </div>
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
            ) : items.length === 0 && !hasKanbanAlerts && !hasAgreementAlerts ? (
              <p className="px-4 py-6 text-sm text-muted">Brak powiadomień.</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-4 text-xs text-muted">Brak innych powiadomień.</p>
            ) : (
              <>
                {unreadCount > 0 ? (
                  <div className="flex items-center justify-between border-b border-border/60 bg-surface-muted/20 px-4 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Inne powiadomienia
                    </p>
                    <NavBadges newCount={unreadCount} size="sm" />
                  </div>
                ) : null}
                {items.map((item) => (
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
              ))}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
