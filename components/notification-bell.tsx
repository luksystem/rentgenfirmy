"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  PalmtreeIcon,
  Sparkles,
  Star,
  Target,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavBadges } from "@/components/nav-badges";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useAgreementHubStore } from "@/store/agreement-hub-store";
import { useNotificationStore } from "@/store/notification-store";
import { useProcessStore } from "@/store/process-store";
import { SALES_NOTIFICATION_KINDS } from "@/lib/notifications/types";
import type { UserNotification } from "@/lib/notifications/types";

export function NotificationBell() {
  const profileId = useAuthStore((state) => state.profile?.id);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const items = useNotificationStore((state) => state.items);
  const loading = useNotificationStore((state) => state.loading);
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const refreshFromRealtime = useNotificationStore((state) => state.refreshFromRealtime);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const setPanelOpen = useNotificationStore((state) => state.setPanelOpen);
  const kanbanNewTaskCount = useProcessStore((state) => state.kanbanNewTaskCount);
  const kanbanOverdueTaskCount = useProcessStore((state) => state.kanbanOverdueTaskCount);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const agreementPendingCounts = useAgreementHubStore((state) => state.pendingCounts);
  const refreshAgreementPendingCounts = useAgreementHubStore((state) => state.refreshPendingCounts);
  const [open, setOpen] = useState(false);
  const [serviceNewCount, setServiceNewCount] = useState(0);
  const [serviceOverdueCount, setServiceOverdueCount] = useState(0);
  const [inspectionsPlanningCount, setInspectionsPlanningCount] = useState(0);
  const [inspectionsBillingCount, setInspectionsBillingCount] = useState(0);
  const [leavePendingCount, setLeavePendingCount] = useState(0);
  const [functionalitySurveyPendingCount, setFunctionalitySurveyPendingCount] = useState(0);
  const [functionalitySurveyLatestHref, setFunctionalitySurveyLatestHref] = useState<string | null>(
    null,
  );
  const panelRef = useRef<HTMLDivElement | null>(null);

  const kanbanAlertCount = kanbanNewTaskCount + kanbanOverdueTaskCount;
  const serviceAlertCount = serviceNewCount + serviceOverdueCount;
  const inspectionsAlertCount = inspectionsPlanningCount + inspectionsBillingCount;
  const agreementAlertCount =
    agreementPendingCounts.pendingTeamApproval +
    agreementPendingCounts.pendingClientApproval +
    agreementPendingCounts.pendingOtherApproval;
  const newBadgeCount =
    kanbanNewTaskCount +
    unreadCount +
    agreementPendingCounts.pendingTeamApproval +
    serviceNewCount +
    inspectionsPlanningCount +
    inspectionsBillingCount +
    leavePendingCount +
    functionalitySurveyPendingCount;
  const overdueBadgeCount = kanbanOverdueTaskCount + serviceOverdueCount;
  const hasKanbanAlerts = kanbanAlertCount > 0;
  const hasServiceAlerts = serviceAlertCount > 0;
  const hasInspectionsAlerts = inspectionsAlertCount > 0;
  const hasAgreementAlerts = agreementAlertCount > 0;
  const hasLeaveAlerts = leavePendingCount > 0;
  const hasFunctionalitySurveyAlerts = functionalitySurveyPendingCount > 0;
  const salesItems = items.filter((item) =>
    (SALES_NOTIFICATION_KINDS as readonly string[]).includes(item.kind),
  );
  const otherItems = items.filter(
    (item) => !(SALES_NOTIFICATION_KINDS as readonly string[]).includes(item.kind),
  );
  const hasSalesAlerts = salesItems.length > 0;
  const hasBadges = newBadgeCount > 0 || overdueBadgeCount > 0;

  const refreshBadge = useCallback(() => {
    if (!profileId) {
      return;
    }
    if (open) {
      void refreshFromRealtime(profileId);
    } else {
      void refreshUnreadCount(profileId);
    }
    void refreshKanbanNewTaskCount();
    void refreshKanbanOverdueTaskCount();
    void refreshAgreementPendingCounts({ force: true });
    void fetch("/api/service-intake/counts", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          activeCount?: number;
          newCount?: number;
          overdueCount?: number;
        };
        setServiceNewCount(payload.newCount ?? 0);
        setServiceOverdueCount(payload.overdueCount ?? 0);
      })
      .catch(() => {
        setServiceNewCount(0);
        setServiceOverdueCount(0);
      });
    void fetch("/api/inspections/counts", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          planningDueCount?: number;
          billingAlertCount?: number;
          newCount?: number;
        };
        setInspectionsPlanningCount(payload.planningDueCount ?? 0);
        setInspectionsBillingCount(payload.billingAlertCount ?? 0);
      })
      .catch(() => {
        setInspectionsPlanningCount(0);
        setInspectionsBillingCount(0);
      });
    void fetch("/api/leave-requests/counts", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { pendingForMeCount?: number };
        setLeavePendingCount(payload.pendingForMeCount ?? 0);
      })
      .catch(() => setLeavePendingCount(0));
    void fetch("/api/functionality-survey/counts", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          pendingReviewCount?: number;
          latest?: {
            projectId: string;
            clientId: string | null;
          } | null;
        };
        setFunctionalitySurveyPendingCount(payload.pendingReviewCount ?? 0);
        const latest = payload.latest;
        if (latest?.clientId) {
          const params = new URLSearchParams({
            project: latest.projectId,
            tab: "functionality-survey",
          });
          setFunctionalitySurveyLatestHref(
            `/przestrzenie/klient/${latest.clientId}?${params.toString()}`,
          );
        } else {
          setFunctionalitySurveyLatestHref("/przestrzenie");
        }
      })
      .catch(() => {
        setFunctionalitySurveyPendingCount(0);
        setFunctionalitySurveyLatestHref(null);
      });
    if (open) {
      void loadNotifications(profileId);
    }
  }, [
    loadNotifications,
    open,
    profileId,
    refreshAgreementPendingCounts,
    refreshFromRealtime,
    refreshKanbanNewTaskCount,
    refreshKanbanOverdueTaskCount,
    refreshUnreadCount,
  ]);

  useEffect(() => {
    function onInspectionsCountChanged() {
      void fetch("/api/inspections/counts", { credentials: "include" })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }
          const payload = (await response.json()) as {
            planningDueCount?: number;
            billingAlertCount?: number;
          };
          setInspectionsPlanningCount(payload.planningDueCount ?? 0);
          setInspectionsBillingCount(payload.billingAlertCount ?? 0);
        })
        .catch(() => {
          setInspectionsPlanningCount(0);
          setInspectionsBillingCount(0);
        });
    }

    function onFunctionalitySurveyCountChanged() {
      void fetch("/api/functionality-survey/counts", { credentials: "include" })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }
          const payload = (await response.json()) as {
            pendingReviewCount?: number;
            latest?: {
              projectId: string;
              clientId: string | null;
            } | null;
          };
          setFunctionalitySurveyPendingCount(payload.pendingReviewCount ?? 0);
          const latest = payload.latest;
          if (latest?.clientId) {
            const params = new URLSearchParams({
              project: latest.projectId,
              tab: "functionality-survey",
            });
            setFunctionalitySurveyLatestHref(
              `/przestrzenie/klient/${latest.clientId}?${params.toString()}`,
            );
          } else {
            setFunctionalitySurveyLatestHref("/przestrzenie");
          }
        })
        .catch(() => {
          setFunctionalitySurveyPendingCount(0);
          setFunctionalitySurveyLatestHref(null);
        });
    }

    window.addEventListener("inspections-count-changed", onInspectionsCountChanged);
    window.addEventListener("functionality-survey-count-changed", onFunctionalitySurveyCountChanged);
    return () => {
      window.removeEventListener("inspections-count-changed", onInspectionsCountChanged);
      window.removeEventListener(
        "functionality-survey-count-changed",
        onFunctionalitySurveyCountChanged,
      );
    };
  }, []);

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
        setPanelOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, setPanelOpen]);

  if (!profileId) {
    return null;
  }

  function renderNotificationItem(item: UserNotification, activeProfileId: string) {
    return (
      <Link
        key={item.id}
        href={item.linkUrl ?? "/tablice-wdrozen"}
        onClick={() => {
          void markRead(activeProfileId, item.id);
          setOpen(false);
          setPanelOpen(false);
        }}
        className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
      >
        {item.kind === "client_stage_rating" ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-200">
            <Star className="h-4 w-4" />
          </span>
        ) : item.kind === "service_intake_preliminary_offer" ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-500/35 bg-sky-500/10 text-sky-200">
            <Sparkles className="h-4 w-4" />
          </span>
        ) : item.kind === "client_offer_accepted" || item.kind === "settlement_offer_accepted" ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-300">
            <BadgeCheck className="h-4 w-4" />
          </span>
        ) : item.kind === "goal_review_due" ||
          item.kind === "goal_period_ending" ||
          item.kind === "goal_at_risk" ||
          item.kind === "goal_recurring_created" ? (
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
              item.kind === "goal_at_risk"
                ? "border-rose-500/35 bg-rose-500/10 text-rose-300"
                : "border-blue-500/35 bg-blue-500/10 text-blue-300",
            )}
          >
            <Target className="h-4 w-4" />
          </span>
        ) : item.kind === "leave_request_created" || item.kind === "leave_request_decided" ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-300">
            <PalmtreeIcon className="h-4 w-4" />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium leading-snug text-foreground">{item.title}</p>
          {item.body ? (
            <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted">
              {item.body}
            </p>
          ) : null}
          <p className="mt-1.5 text-[10px] text-muted">{formatDate(item.createdAt)}</p>
        </span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="relative shrink-0"
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            setPanelOpen(next);
            return next;
          });
        }}
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

            {hasLeaveAlerts ? (
              <div className="border-b border-border/60 bg-surface-muted/20">
                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Pracownicy
                </p>
                <Link
                  href="/pracownicy/urlopy"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-300">
                    <PalmtreeIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">Wnioski urlopowe do akceptacji</p>
                      <NavBadges newCount={leavePendingCount} size="sm" />
                    </div>
                    <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                      {leavePendingCount === 1
                        ? "1 wniosek o urlop czeka na Twoją decyzję."
                        : `${leavePendingCount} wniosków o urlop czeka na Twoją decyzję.`}
                    </p>
                  </span>
                </Link>
              </div>
            ) : null}

            {hasFunctionalitySurveyAlerts ? (
              <div className="border-b border-border/60 bg-surface-muted/20">
                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Ankiety funkcji
                </p>
                <Link
                  href={functionalitySurveyLatestHref ?? "/przestrzenie"}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-500/35 bg-violet-500/10 text-violet-200">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">Klient wypełnił ankietę</p>
                      <NavBadges newCount={functionalitySurveyPendingCount} size="sm" />
                    </div>
                    <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                      {functionalitySurveyPendingCount === 1
                        ? "1 ankieta funkcji czeka na przejrzenie przez zespół."
                        : `${functionalitySurveyPendingCount} ankiet funkcji czeka na przejrzenie przez zespół.`}
                    </p>
                  </span>
                </Link>
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

            {hasServiceAlerts ? (
              <div className="border-b border-border/60 bg-surface-muted/20">
                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Zgłoszenia serwisowe
                </p>
                {serviceNewCount > 0 ? (
                  <Link
                    href="/tablice-wdrozen/serwis"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-500/35 bg-sky-500/10 text-sky-200">
                      <Wrench className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Nowe zgłoszenia serwisowe</p>
                        <NavBadges newCount={serviceNewCount} size="sm" />
                      </div>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                        {serviceNewCount === 1
                          ? "1 nowe zgłoszenie na pierwszym etapie, bez przypisanej osoby."
                          : `${serviceNewCount} nowych zgłoszeń na pierwszym etapie, bez przypisanej osoby.`}
                      </p>
                    </span>
                  </Link>
                ) : null}
                {serviceOverdueCount > 0 ? (
                  <Link
                    href="/tablice-wdrozen/serwis"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Przeterminowane zgłoszenia</p>
                        <NavBadges overdueCount={serviceOverdueCount} size="sm" />
                      </div>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                        {serviceOverdueCount === 1
                          ? "1 zgłoszenie przekroczyło termin reakcji."
                          : `${serviceOverdueCount} zgłoszeń przekroczyło termin reakcji.`}
                      </p>
                    </span>
                  </Link>
                ) : null}
              </div>
            ) : null}

            {hasInspectionsAlerts ? (
              <div className="border-b border-border/60 bg-surface-muted/20">
                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Przeglądy serwisowe
                </p>
                {inspectionsPlanningCount > 0 ? (
                  <Link
                    href="/przeglady"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-200">
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Zaplanuj termin przeglądu</p>
                        <NavBadges newCount={inspectionsPlanningCount} size="sm" />
                      </div>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                        {inspectionsPlanningCount === 1
                          ? "1 przegląd wymaga potwierdzenia konkretnej daty wizyty (ok. 2 tyg. przed terminem)."
                          : `${inspectionsPlanningCount} przeglądów wymaga potwierdzenia konkretnej daty wizyty.`}
                      </p>
                    </span>
                  </Link>
                ) : null}
                {inspectionsBillingCount > 0 ? (
                  <Link
                    href="/przeglady"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface-muted/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-500/35 bg-violet-500/10 text-violet-200">
                      <ClipboardCheck className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Przeglądy do rozliczenia</p>
                        <NavBadges newCount={inspectionsBillingCount} size="sm" />
                      </div>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                        {inspectionsBillingCount === 1
                          ? "1 zrealizowany przegląd czeka na rozliczenie."
                          : `${inspectionsBillingCount} zrealizowanych przeglądów czeka na rozliczenie.`}
                      </p>
                    </span>
                  </Link>
                ) : null}
              </div>
            ) : null}

            {hasSalesAlerts ? (
              <div className="border-b border-border/60 bg-surface-muted/20">
                <div className="flex items-center justify-between px-4 pb-1 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Sprzedaż</p>
                  <NavBadges newCount={salesItems.length} size="sm" />
                </div>
                {salesItems.map((item) => (
                  <div key={item.id} className="border-b border-border/50 bg-accent/5">
                    {renderNotificationItem(item, profileId)}
                  </div>
                ))}
              </div>
            ) : null}

            {loading ? (
              <p className="px-4 py-6 text-sm text-muted">Ładowanie…</p>
            ) : items.length === 0 &&
              !hasKanbanAlerts &&
              !hasAgreementAlerts &&
              !hasServiceAlerts &&
              !hasLeaveAlerts &&
              !hasFunctionalitySurveyAlerts &&
              !hasSalesAlerts ? (
              <p className="px-4 py-6 text-sm text-muted">Brak powiadomień.</p>
            ) : otherItems.length === 0 ? (
              <p className="px-4 py-4 text-xs text-muted">Brak innych powiadomień.</p>
            ) : (
              <>
                {otherItems.some((item) => !item.readAt) ? (
                  <div className="flex items-center justify-between border-b border-border/60 bg-surface-muted/20 px-4 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Inne powiadomienia
                    </p>
                    <NavBadges
                      newCount={otherItems.filter((item) => !item.readAt).length}
                      size="sm"
                    />
                  </div>
                ) : null}
                {otherItems.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-border/50 bg-accent/5"
                  >
                    {renderNotificationItem(item, profileId)}
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="border-t border-border/70 px-4 py-2.5">
            <Link
              href="/ustawienia/powiadomienia"
              onClick={() => setOpen(false)}
              className="text-xs text-accent hover:underline"
            >
              Ustawienia powiadomień push
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
