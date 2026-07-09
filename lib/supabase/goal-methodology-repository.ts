import { getSupabase } from "@/lib/supabase/client";
import { rowToGoalMethodology } from "@/lib/supabase/goal-mappers";
import type { GoalMethodology } from "@/lib/goals/types";

export async function fetchGoalMethodologies(): Promise<GoalMethodology[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_methodologies")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalMethodology);
}

export async function fetchGoalMethodologyByCode(code: string): Promise<GoalMethodology | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_methodologies")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToGoalMethodology(data) : null;
}
