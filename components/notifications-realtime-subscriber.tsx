"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAgreementsHubRealtime } from "@/hooks/use-agreements-hub-realtime";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";
import { useAuthStore } from "@/store/auth-store";
import { useAgreementHubStore } from "@/store/agreement-hub-store";
import { useLeaveStore } from "@/store/leave-store";
import { useNotificationStore } from "@/store/notification-store";
import { useProcessStore } from "@/store/process-store";
import { useMyWorkStore } from "@/store/my-work-store";

const MY_WORK_BACKGROUND_DEBOUNCE_MS = 2_000;

/** Jedna subskrypcja realtime na całą aplikację (unika konfliktu przy dwóch dzwonkach w shellu). */
export function NotificationsRealtimeSubscriber() {
  const profileId = useAuthStore((state) => state.profile?.id);
  const refreshFromRealtime = useNotificationStore((state) => state.refreshFromRealtime);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const refreshAgreementPendingCounts = useAgreementHubStore((state) => state.refreshPendingCounts);
  const myWorkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleMyWorkBackgroundRefresh = useCallback(() => {
    if (myWorkDebounceRef.current) {
      clearTimeout(myWorkDebounceRef.current);
    }

    myWorkDebounceRef.current = setTimeout(() => {
      myWorkDebounceRef.current = null;
      const myWorkState = useMyWorkStore.getState();
      if (myWorkState.myItemsHydrated) {
        void myWorkState.ensureMyItems({ force: true, showLoading: false, sync: false });
      }
      if (myWorkState.teamItemsHydrated) {
        void myWorkState.ensureTeamItems({ force: true, showLoading: false, sync: false });
      }
    }, MY_WORK_BACKGROUND_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (myWorkDebounceRef.current) {
        clearTimeout(myWorkDebounceRef.current);
      }
    };
  }, []);

  const refresh = useCallback(() => {
    if (!profileId) {
      return;
    }
    void refreshFromRealtime(profileId);
    void refreshKanbanNewTaskCount();
    void refreshKanbanOverdueTaskCount();
    void refreshAgreementPendingCounts({ force: true });

    const leaveState = useLeaveStore.getState();
    if (leaveState.myRequestsHydrated) {
      void leaveState.ensureMyRequests({ force: true });
    }
    if (leaveState.allRequestsHydrated) {
      void leaveState.ensureAllRequests({ force: true });
    }
    if (leaveState.planningRequestsHydrated) {
      void leaveState.ensurePlanningRequests({ force: true });
    }
    void leaveState.refreshPendingForMeCount();

    scheduleMyWorkBackgroundRefresh();
  }, [
    profileId,
    refreshAgreementPendingCounts,
    refreshFromRealtime,
    refreshKanbanNewTaskCount,
    refreshKanbanOverdueTaskCount,
    scheduleMyWorkBackgroundRefresh,
  ]);

  useNotificationsRealtime(profileId, refresh);
  useAgreementsHubRealtime(refresh);

  return null;
}
