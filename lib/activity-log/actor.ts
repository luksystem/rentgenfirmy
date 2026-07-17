import { useAuthStore } from "@/store/auth-store";
import type { ActivityLogActor } from "@/lib/activity-log/types";

/** Odczyt aktora z sesji UI (store). Bezpieczne poza komponentami React. */
export function getActivityActor(fallbackName = "Użytkownik"): ActivityLogActor {
  const state = useAuthStore.getState();
  const name = state.displayName?.trim() || fallbackName;
  return {
    userId: state.user?.id ?? state.profile?.id ?? null,
    name,
  };
}
