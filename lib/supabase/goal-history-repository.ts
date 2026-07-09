import type { UserProfile } from "@/lib/auth/types";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";
import { fetchAllGoals } from "@/lib/supabase/goal-repository";
import type { Goal } from "@/lib/goals/types";

/**
 * Zbiór danych pod ekrany analityczne (#6 Podsumowanie, #7 Historia i wnioski).
 * Jedno zapytanie po wszystkie cele + profile zespołu — agregacje liczone po stronie
 * klienta (useMemo w komponentach), bez N+1 (patrz `goal-collective-view.tsx` — ten
 * sam wzorzec pobierania całego zbioru celów naraz).
 */
export async function fetchGoalReportingDataset(): Promise<{
  goals: Goal[];
  teamProfiles: UserProfile[];
}> {
  const [goals, teamProfiles] = await Promise.all([fetchAllGoals(), fetchTeamProfiles()]);
  return { goals, teamProfiles };
}
