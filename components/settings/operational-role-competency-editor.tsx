"use client";

import { useEffect, useState } from "react";
import { ResourcePlanCompetencyRequirementsEditor } from "@/components/resource-plan/resource-plan-competency-requirements-editor";
import type { ResourcePlanCompetencyRequirement } from "@/lib/resource-plan/types";
import {
  fetchOperationalRoleCompetencyRequirements,
  setOperationalRoleCompetencyRequirements,
} from "@/lib/supabase/operational-role-competency-repository";

/** Faza 3 (Kompetencje) — wymagane kompetencje dla funkcji wykonawczej (operational_role), nie project_role_slot (docs/08 D21/D22). */
export function OperationalRoleCompetencyEditor({ roleItemId }: { roleItemId: string }) {
  const [value, setValue] = useState<ResourcePlanCompetencyRequirement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setValue(null);
    void fetchOperationalRoleCompetencyRequirements(roleItemId)
      .then((rows) => {
        if (!cancelled) setValue(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Błąd wczytywania wymagań.");
      });
    return () => {
      cancelled = true;
    };
  }, [roleItemId]);

  async function handleChange(next: ResourcePlanCompetencyRequirement[]) {
    const previous = value ?? [];
    setValue(next);
    setError(null);
    try {
      await setOperationalRoleCompetencyRequirements(roleItemId, next);
    } catch (err) {
      setValue(previous);
      setError(err instanceof Error ? err.message : "Błąd zapisu wymagań.");
    }
  }

  if (value === null) {
    return <p className="text-xs text-muted">Ładowanie wymaganych kompetencji…</p>;
  }

  return (
    <div className="grid gap-1">
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      <ResourcePlanCompetencyRequirementsEditor
        value={value}
        onChange={(next) => void handleChange(next)}
        label="Wymagane kompetencje dla tej roli"
        description="Zasila mapę luk kompetencji (Plan Zasobów → Dashboard) — nie blokuje przydziału, tylko pokazuje, gdzie firma nie ma głębi."
      />
    </div>
  );
}
