import { getSupabase } from "@/lib/supabase/client";
import type { BudgetScenarioActionRow } from "@/lib/supabase/database.types";
import {
  budgetScenarioActionToInsertRow,
  budgetScenarioActionToUpdateRow,
  rowToBudgetScenarioAction,
} from "@/lib/supabase/budget-forecast-mappers";
import type { BudgetScenarioAction, BudgetScenarioActionInput } from "@/lib/budget-forecast/types";

export async function fetchAllBudgetScenarioActions(): Promise<BudgetScenarioAction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budget_scenario_actions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BudgetScenarioActionRow[]).map(rowToBudgetScenarioAction);
}

export async function createBudgetScenarioAction(
  input: BudgetScenarioActionInput,
): Promise<BudgetScenarioAction> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budget_scenario_actions")
    .insert(budgetScenarioActionToInsertRow(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToBudgetScenarioAction(data as BudgetScenarioActionRow);
}

export async function updateBudgetScenarioAction(
  id: string,
  patch: Partial<BudgetScenarioAction>,
): Promise<BudgetScenarioAction> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budget_scenario_actions")
    .update(budgetScenarioActionToUpdateRow(patch))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToBudgetScenarioAction(data as BudgetScenarioActionRow);
}

export async function deleteBudgetScenarioAction(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("budget_scenario_actions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setBudgetScenarioActionEnabled(
  id: string,
  isEnabled: boolean,
): Promise<BudgetScenarioAction> {
  return updateBudgetScenarioAction(id, { isEnabled });
}
