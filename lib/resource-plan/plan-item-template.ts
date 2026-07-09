// Szablony elementu planu — powtarzalne "gotowce" (np. "Produkcja rozdzielni") do szybkiego
// wypełnienia formularza elementu planu. Przechowywane jako pozycje generycznego słownika
// (`dictionary_key = 'plan_item_template'`), a ich rozszerzone pola w kolumnie `metadata`.

import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";

export type PlanItemTemplateMetadata = {
  workTypeItemId: string | null;
  plannedHours: number | null;
  laborBudget: number | null;
  materialBudget: number | null;
  travelBudget: number | null;
  riskItemId: string | null;
  notes: string;
};

export const EMPTY_PLAN_ITEM_TEMPLATE_METADATA: PlanItemTemplateMetadata = {
  workTypeItemId: null,
  plannedHours: null,
  laborBudget: null,
  materialBudget: null,
  travelBudget: null,
  riskItemId: null,
  notes: "",
};

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readPlanItemTemplateMetadata(metadata: Record<string, unknown>): PlanItemTemplateMetadata {
  return {
    workTypeItemId: readNullableString(metadata.workTypeItemId),
    plannedHours: readNullableNumber(metadata.plannedHours),
    laborBudget: readNullableNumber(metadata.laborBudget),
    materialBudget: readNullableNumber(metadata.materialBudget),
    travelBudget: readNullableNumber(metadata.travelBudget),
    riskItemId: readNullableString(metadata.riskItemId),
    notes: typeof metadata.notes === "string" ? metadata.notes : "",
  };
}

export function writePlanItemTemplateMetadata(value: PlanItemTemplateMetadata): Record<string, unknown> {
  return { ...value };
}

/** Skrócony opis do wyświetlenia w liście wyboru szablonu (np. "8h · Montaż"). */
export function describePlanItemTemplate(
  template: DictionaryItem,
  options: { workTypeName?: string | null; riskName?: string | null } = {},
): string {
  const meta = readPlanItemTemplateMetadata(template.metadata);
  const parts = [
    meta.plannedHours ? `${meta.plannedHours}h` : null,
    options.workTypeName ?? null,
    options.riskName ? `Ryzyko: ${options.riskName}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}
