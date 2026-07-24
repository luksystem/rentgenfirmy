import { getSupabase } from "@/lib/supabase/client";
import type { BudgetCostItemRow } from "@/lib/supabase/database.types";
import {
  budgetCostItemToInsertRow,
  budgetCostItemToUpdateRow,
  rowToBudgetCostItem,
} from "@/lib/supabase/budget-forecast-mappers";
import type { BudgetCostItem, BudgetCostItemInput } from "@/lib/budget-forecast/types";

export async function fetchAllBudgetCostItems(): Promise<BudgetCostItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budget_cost_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BudgetCostItemRow[]).map(rowToBudgetCostItem);
}

export async function fetchActiveBudgetCostItems(): Promise<BudgetCostItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budget_cost_items")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BudgetCostItemRow[]).map(rowToBudgetCostItem);
}

export async function fetchBudgetCostItemById(id: string): Promise<BudgetCostItem | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budget_cost_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToBudgetCostItem(data as BudgetCostItemRow) : null;
}

export async function createBudgetCostItem(input: BudgetCostItemInput): Promise<BudgetCostItem> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budget_cost_items")
    .insert(budgetCostItemToInsertRow(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToBudgetCostItem(data as BudgetCostItemRow);
}

export async function updateBudgetCostItem(
  id: string,
  patch: Partial<BudgetCostItem>,
): Promise<BudgetCostItem> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("budget_cost_items")
    .update(budgetCostItemToUpdateRow(patch))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToBudgetCostItem(data as BudgetCostItemRow);
}

export async function deleteBudgetCostItem(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("budget_cost_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setBudgetCostItemActive(id: string, isActive: boolean): Promise<BudgetCostItem> {
  return updateBudgetCostItem(id, { isActive });
}
