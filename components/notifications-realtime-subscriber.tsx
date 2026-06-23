"use client";

import { useCallback } from "react";
import { useAgreementsHubRealtime } from "@/hooks/use-agreements-hub-realtime";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";
import { useAuthStore } from "@/store/auth-store";
import { useAgreementHubStore } from "@/store/agreement-hub-store";
import { useNotificationStore } from "@/store/notification-store";
import { useProcessStore } from "@/store/process-store";

/** Jedna subskrypcja realtime na całą aplikację (unika konfliktu przy dwóch dzwonkach w shellu). */
export function NotificationsRealtimeSubscriber() {
  const profileId = useAuthStore((state) => state.profile?.id);
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);
  const refreshAgreementPendingCounts = useAgreementHubStore((state) => state.refreshPendingCounts);

  const refresh = useCallback(() => {
    if (!profileId) {
      return;
    }
    void refreshUnreadCount(profileId);
    void refreshKanbanNewTaskCount();
    void refreshKanbanOverdueTaskCount();
    void refreshAgreementPendingCounts({ force: true });
  }, [
    profileId,
    refreshAgreementPendingCounts,
    refreshKanbanNewTaskCount,
    refreshKanbanOverdueTaskCount,
    refreshUnreadCount,
  ]);

  useNotificationsRealtime(profileId, refresh);
  useAgreementsHubRealtime(refresh);

  return null;
}
