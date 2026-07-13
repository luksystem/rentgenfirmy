"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useCanManageWorkItems, useMyWorkStore } from "@/store/my-work-store";

const PLAN_POLL_INTERVAL_MS = 5 * 60 * 1000;

/** Odświeża plan dnia i tygodnia w tle — bez przeładowania strony i bez spinnera. */
export function MyWorkPlansPoller() {
  const profileId = useAuthStore((state) => state.profile?.id);
  const profileRole = useAuthStore((state) => state.profile?.role);
  const canManage = useCanManageWorkItems(profileRole);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    const refreshPlans = () => {
      const state = useMyWorkStore.getState();
      void state.ensureDayContext({ force: true, showLoading: false });
      void state.ensureWeekPlan({
        force: true,
        showLoading: false,
        assignedUserId: canManage ? state.weekPlanForUserId : null,
        referenceDate: state.weekPlanReferenceDate,
      });
    };

    const intervalId = window.setInterval(refreshPlans, PLAN_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [profileId, canManage]);

  return null;
}
