"use client";

import { create } from "zustand";
import { useLeaveStore } from "@/store/leave-store";
import { useProcessStore } from "@/store/process-store";

type NavBadgeState = {
  serviceIntakeNewCount: number;
  serviceIntakeOverdueCount: number;
  contactsNewCount: number;
  intakeOffersNewCount: number;
  inspectionsPlanningCount: number;
  inspectionsPlanningOverdueCount: number;
  inspectionsBillingCount: number;
  functionalitySurveyPendingCount: number;
  functionalitySurveyLatestHref: string | null;
  monthlyReviewPendingForMeCount: number;
  pollStarted: boolean;
  refreshHttpBadges: () => Promise<void>;
  refreshAll: () => Promise<void>;
  startPolling: () => void;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const useNavBadgeStore = create<NavBadgeState>((set, get) => ({
  serviceIntakeNewCount: 0,
  serviceIntakeOverdueCount: 0,
  contactsNewCount: 0,
  intakeOffersNewCount: 0,
  inspectionsPlanningCount: 0,
  inspectionsPlanningOverdueCount: 0,
  inspectionsBillingCount: 0,
  functionalitySurveyPendingCount: 0,
  functionalitySurveyLatestHref: null,
  monthlyReviewPendingForMeCount: 0,
  pollStarted: false,

  refreshHttpBadges: async () => {
    const [serviceIntake, contacts, intakeOffers, inspections, functionalitySurvey, monthlyReview] =
      await Promise.all([
        fetchJson<{ newCount?: number; overdueCount?: number }>("/api/service-intake/counts"),
        fetchJson<{ newCount?: number; unhandledCount?: number }>("/api/contacts/counts"),
        fetchJson<{ newCount?: number; unreviewedCount?: number }>(
          "/api/services/intake-offers/counts",
        ),
        fetchJson<{
          planningDueCount?: number;
          planningOverdueCount?: number;
          billingAlertCount?: number;
        }>("/api/inspections/counts"),
        fetchJson<{
          pendingReviewCount?: number;
          latest?: { projectId: string; clientId: string | null } | null;
        }>("/api/functionality-survey/counts"),
        fetchJson<{ pendingForMeCount?: number }>("/api/monthly-reviews/counts"),
      ]);

    let functionalitySurveyLatestHref: string | null = null;
    const latest = functionalitySurvey?.latest;
    if (latest?.clientId) {
      const params = new URLSearchParams({
        project: latest.projectId,
        tab: "functionality-survey",
      });
      functionalitySurveyLatestHref = `/przestrzenie/klient/${latest.clientId}?${params.toString()}`;
    } else if (functionalitySurvey) {
      functionalitySurveyLatestHref = "/przestrzenie";
    }

    set({
      serviceIntakeNewCount: serviceIntake?.newCount ?? 0,
      serviceIntakeOverdueCount: serviceIntake?.overdueCount ?? 0,
      contactsNewCount: contacts?.newCount ?? contacts?.unhandledCount ?? 0,
      intakeOffersNewCount: intakeOffers?.newCount ?? intakeOffers?.unreviewedCount ?? 0,
      inspectionsPlanningCount: inspections?.planningDueCount ?? 0,
      inspectionsPlanningOverdueCount: inspections?.planningOverdueCount ?? 0,
      inspectionsBillingCount: inspections?.billingAlertCount ?? 0,
      functionalitySurveyPendingCount: functionalitySurvey?.pendingReviewCount ?? 0,
      functionalitySurveyLatestHref,
      monthlyReviewPendingForMeCount: monthlyReview?.pendingForMeCount ?? 0,
    });
  },

  refreshAll: async () => {
    await Promise.all([
      get().refreshHttpBadges(),
      useLeaveStore.getState().refreshPendingForMeCount(),
      useProcessStore.getState().refreshKanbanNewTaskCount(),
      useProcessStore.getState().refreshKanbanOverdueTaskCount(),
    ]);
  },

  startPolling: () => {
    if (typeof window === "undefined" || get().pollStarted) return;
    set({ pollStarted: true });
    void get().refreshAll();

    window.setInterval(() => {
      void get().refreshHttpBadges();
      void useLeaveStore.getState().refreshPendingForMeCount();
    }, 30000);

    const onFocus = () => {
      void get().refreshHttpBadges();
      void useLeaveStore.getState().refreshPendingForMeCount();
    };
    const onCountChanged = () => {
      void get().refreshHttpBadges();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("contacts-count-changed", onCountChanged);
    window.addEventListener("services-intake-count-changed", onCountChanged);
    window.addEventListener("inspections-count-changed", onCountChanged);
    window.addEventListener("functionality-survey-count-changed", onCountChanged);
  },
}));
