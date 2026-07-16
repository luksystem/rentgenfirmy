"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ensureGoalActivityNotifications } from "@/lib/notifications/goal-activity";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore } from "@/store/goal-store";
import { useNotificationStore } from "@/store/notification-store";

export function GoalHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useGoalStore((state) => state.hydrate);
  const hydrated = useGoalStore((state) => state.hydrated);
  const error = useGoalStore((state) => state.error);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void ensureGoalActivityNotifications()
      .then(() => {
        const profileId = useAuthStore.getState().profile?.id;
        if (profileId) {
          void useNotificationStore.getState().refreshFromRealtime(profileId);
        }
      })
      .catch(() => undefined);
  }, [hydrated]);

  if (error && !hydrated) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-rose-400">{error}</p>
        <Button type="button" variant="secondary" onClick={() => void hydrate()}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
