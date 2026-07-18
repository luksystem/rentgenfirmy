import { useAuthStore } from "@/store/auth-store";
import type { ActivityLogActor } from "@/lib/activity-log/types";

/** Odczyt aktora z sesji UI (store). Bezpieczne poza komponentami React. */
export function getActivityActor(fallbackName = "Użytkownik"): ActivityLogActor {
  const state = useAuthStore.getState();
  const name = state.displayName?.trim() || fallbackName;
  // actor_user_id → profiles(id); preferuj profile.id (auth.users.id może się różnić).
  return {
    userId: state.profile?.id ?? state.user?.id ?? null,
    name,
  };
}
