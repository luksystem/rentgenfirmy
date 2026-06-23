"use client";

import { useCallback } from "react";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import { useProcessStore } from "@/store/process-store";

/** Jedna subskrypcja realtime na całą aplikację (unika konfliktu przy dwóch dzwonkach w shellu). */
export function NotificationsRealtimeSubscriber() {
  const profileId = useAuthStore((state) => state.profile?.id);
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const refreshKanbanNewTaskCount = useProcessStore((state) => state.refreshKanbanNewTaskCount);
  const refreshKanbanOverdueTaskCount = useProcessStore((state) => state.refreshKanbanOverdueTaskCount);

  const refresh = useCallback(() => {
    if (!profileId) {
      return;
    }
    void refreshUnreadCount(profileId);
    void refreshKanbanNewTaskCount();
    void refreshKanbanOverdueTaskCount();
  }, [
    profileId,
    refreshKanbanNewTaskCount,
    refreshKanbanOverdueTaskCount,
    refreshUnreadCount,
  ]);

  useNotificationsRealtime(profileId, refresh);

  return null;
}
