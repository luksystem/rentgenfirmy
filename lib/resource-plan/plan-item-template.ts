// Szablony elementu planu — powtarzalne "gotowce" (np. "Produkcja rozdzielni") do szybkiego
// wypełnienia formularza elementu planu. Przechowywane jako pozycje generycznego słownika
// (`dictionary_key = 'plan_item_template'`), a ich rozszerzone pola w kolumnie `metadata`.

import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import type { ResourcePlanCompetencyRequirement } from "@/lib/resource-plan/types";

export type PlanItemTemplateMetadata = {
  workTypeItemId: string | null;
  plannedHours: number | null;
  laborBudget: number | null;
  materialBudget: number | null;
  travelBudget: number | null;
  riskItemId: string | null;
  notes: string;
  requiredCompetencies: ResourcePlanCompetencyRequirement[];
};

export const EMPTY_PLAN_ITEM_TEMPLATE_METADATA: PlanItemTemplateMetadata = {
  workTypeItemId: null,
  plannedHours: null,
  laborBudget: null,
  materialBudget: null,
  travelBudget: null,
  riskItemId: null,
  notes: "",
  requiredCompetencies: [],
};

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readCompetencyRequirements(value: unknown): ResourcePlanCompetencyRequirement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const competencyItemId = readNullableString(record.competencyItemId);
      if (!competencyItemId) return null;
      return {
        competencyItemId,
        minLevelItemId: readNullableString(record.minLevelItemId),
      };
    })
    .filter((entry): entry is ResourcePlanCompetencyRequirement => entry !== null);
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
    requiredCompetencies: readCompetencyRequirements(metadata.requiredCompetencies),
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
    meta.requiredCompetencies.length > 0 ? `${meta.requiredCompetencies.length} komp.` : null,
    options.riskName ? `Ryzyko: ${options.riskName}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}
