import type {
  BudgetCostItemInsert,
  BudgetCostItemRow,
  BudgetCostItemUpdate,
  BudgetScenarioActionInsert,
  BudgetScenarioActionRow,
  BudgetScenarioActionUpdate,
  ProjectRevenueForecastInsert,
  ProjectRevenueForecastRow,
  ProjectRevenueForecastUpdate,
} from "@/lib/supabase/database.types";
import {
  isBudgetConfidenceLevel,
  isBudgetCostCadence,
  isBudgetCostCategory,
  isBudgetScenarioEffectType,
  type BudgetCostItem,
  type BudgetCostItemInput,
  type BudgetScenarioAction,
  type BudgetScenarioActionInput,
  type ProjectRevenueForecast,
  type ProjectRevenueForecastInput,
} from "@/lib/budget-forecast/types";

function num(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function rowToBudgetCostItem(row: BudgetCostItemRow): BudgetCostItem {
  return {
    id: row.id,
    name: row.name,
    category: isBudgetCostCategory(row.category) ? row.category : "inne",
    amount: num(row.amount),
    cadence: isBudgetCostCadence(row.cadence) ? row.cadence : "monthly",
    intervalMonths: row.interval_months ?? null,
    month: row.month,
    startMonth: row.start_month,
    endMonth: row.end_month,
    isActive: row.is_active,
    notes: row.notes ?? "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function budgetCostItemToInsertRow(input: BudgetCostItemInput): BudgetCostItemInsert {
  return {
    name: input.name,
    category: input.category,
    amount: input.amount,
    cadence: input.cadence,
    interval_months: input.intervalMonths ?? null,
    month: input.month ?? null,
    start_month: input.startMonth,
    end_month: input.endMonth ?? null,
    is_active: input.isActive ?? true,
    notes: input.notes ?? "",
  };
}

export function budgetCostItemToUpdateRow(patch: Partial<BudgetCostItem>): BudgetCostItemUpdate {
  const row: BudgetCostItemUpdate = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.cadence !== undefined) row.cadence = patch.cadence;
  if (patch.intervalMonths !== undefined) row.interval_months = patch.intervalMonths;
  if (patch.month !== undefined) row.month = patch.month;
  if (patch.startMonth !== undefined) row.start_month = patch.startMonth;
  if (patch.endMonth !== undefined) row.end_month = patch.endMonth;
  if (patch.isActive !== undefined) row.is_active = patch.isActive;
  if (patch.notes !== undefined) row.notes = patch.notes;
  row.updated_at = new Date().toISOString();
  return row;
}

export function rowToProjectRevenueForecast(row: ProjectRevenueForecastRow): ProjectRevenueForecast {
  return {
    id: row.id,
    projectId: row.project_id,
    expectedDate: row.expected_date,
    amountGross: num(row.amount_gross),
    confidence: isBudgetConfidenceLevel(row.confidence) ? row.confidence : "medium",
    notes: row.notes ?? "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function projectRevenueForecastToInsertRow(
  input: ProjectRevenueForecastInput,
): ProjectRevenueForecastInsert {
  return {
    project_id: input.projectId,
    expected_date: input.expectedDate,
    amount_gross: input.amountGross,
    confidence: input.confidence,
    notes: input.notes ?? "",
  };
}

export function projectRevenueForecastToUpdateRow(
  patch: Partial<ProjectRevenueForecast>,
): ProjectRevenueForecastUpdate {
  const row: ProjectRevenueForecastUpdate = {};
  if (patch.expectedDate !== undefined) row.expected_date = patch.expectedDate;
  if (patch.amountGross !== undefined) row.amount_gross = patch.amountGross;
  if (patch.confidence !== undefined) row.confidence = patch.confidence;
  if (patch.notes !== undefined) row.notes = patch.notes;
  row.updated_at = new Date().toISOString();
  return row;
}

export function rowToBudgetScenarioAction(row: BudgetScenarioActionRow): BudgetScenarioAction {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes ?? "",
    effectType: isBudgetScenarioEffectType(row.effect_type) ? row.effect_type : "cost",
    amount: num(row.amount),
    cadence: isBudgetCostCadence(row.cadence) ? row.cadence : "monthly",
    intervalMonths: row.interval_months ?? null,
    month: row.month,
    startMonth: row.start_month,
    endMonth: row.end_month,
    isEnabled: row.is_enabled,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function budgetScenarioActionToInsertRow(
  input: BudgetScenarioActionInput,
): BudgetScenarioActionInsert {
  return {
    name: input.name,
    notes: input.notes ?? "",
    effect_type: input.effectType,
    amount: input.amount,
    cadence: input.cadence,
    interval_months: input.intervalMonths ?? null,
    month: input.month ?? null,
    start_month: input.startMonth,
    end_month: input.endMonth ?? null,
    is_enabled: input.isEnabled ?? true,
  };
}

export function budgetScenarioActionToUpdateRow(
  patch: Partial<BudgetScenarioAction>,
): BudgetScenarioActionUpdate {
  const row: BudgetScenarioActionUpdate = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.effectType !== undefined) row.effect_type = patch.effectType;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.cadence !== undefined) row.cadence = patch.cadence;
  if (patch.intervalMonths !== undefined) row.interval_months = patch.intervalMonths;
  if (patch.month !== undefined) row.month = patch.month;
  if (patch.startMonth !== undefined) row.start_month = patch.startMonth;
  if (patch.endMonth !== undefined) row.end_month = patch.endMonth;
  if (patch.isEnabled !== undefined) row.is_enabled = patch.isEnabled;
  row.updated_at = new Date().toISOString();
  return row;
}
