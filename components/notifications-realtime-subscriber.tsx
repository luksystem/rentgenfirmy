"use client";

import { useCallback } from "react";
import { useAgreementsHubRealtime } from "@/hooks/use-agreements-hub-realtime";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";
import { useAuthStore } from "@/store/auth-store";
import { useAgreementHubStore } from "@/store/agreement-hub-store";
import { useLeaveStore } from "@/store/leave-store";
import { useNotificationStore } from "@/store/notification-store";
import { useProcessStore } from "@/store/process-store";
import { useMyWorkStore } from "@/store/my-work-store";

/** Jedna subskrypcja realtime na całą aplikację (unika konfliktu przy dwóch dzwonkach w shellu). */
export function NotificationsRealtimeSubscriber() {
  const profileId = useAuthStore((state) => state.profile?.id);
  const refreshFromRealtime = useNotificationStore((state) => state.refreshFromRealtime);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const refreshAgreementPendingCounts = useAgreementHubStore((state) => state.refreshPendingCounts);

  const refresh = useCallback(() => {
    if (!profileId) {
      return;
    }
    void refreshFromRealtime(profileId);
    void refreshKanbanNewTaskCount();
    void refreshKanbanOverdueTaskCount();
    void refreshAgreementPendingCounts({ force: true });

    // Wnioski urlopowe: odświeżamy cache tylko jeśli był już wczytany na tej stronie —
    // dzięki temu decyzja przełożonego/administratora natychmiast pojawia się w historii
    // pracownika (i odwrotnie, nowy wniosek u przełożonego), bez czekania na przeładowanie.
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

    const myWorkState = useMyWorkStore.getState();
    if (myWorkState.myItemsHydrated) {
      void myWorkState.ensureMyItems({ force: true });
    }
    if (myWorkState.teamItemsHydrated) {
      void myWorkState.ensureTeamItems({ force: true });
    }
  }, [
    profileId,
    refreshAgreementPendingCounts,
    refreshFromRealtime,
    refreshKanbanNewTaskCount,
    refreshKanbanOverdueTaskCount,
  ]);

  useNotificationsRealtime(profileId, refresh);
  useAgreementsHubRealtime(refresh);

  return null;
}
