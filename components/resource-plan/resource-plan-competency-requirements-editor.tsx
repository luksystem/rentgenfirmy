"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import type { ResourcePlanCompetencyRequirement } from "@/lib/resource-plan/types";
import { useDictionaryStore } from "@/store/dictionary-store";

/** Edytor wymaganych kompetencji — wspólny dla szablonu elementu planu i samego przydziału. */
export function ResourcePlanCompetencyRequirementsEditor({
  value,
  onChange,
  label = "Potrzebne kompetencje",
  description = "Porównywane z kompetencjami użytkowników przy sugestiach i walidacji.",
}: {
  value: ResourcePlanCompetencyRequirement[];
  onChange: (next: ResourcePlanCompetencyRequirement[]) => void;
  label?: string;
  description?: string;
}) {
  const ensureDictionaries = useDictionaryStore((state) => state.ensure);
  const competencyOptions = useDictionaryStore((state) => state.byKey("competency"));
  const levelOptions = useDictionaryStore((state) => state.byKey("competency_level"));
  const [newCompetencyId, setNewCompetencyId] = useState("");
  const [newLevelId, setNewLevelId] = useState("");

  useEffect(() => {
    void ensureDictionaries();
  }, [ensureDictionaries]);

  return (
    <div className="grid gap-2">
      <div>
        <p className="text-sm font-medium text-foreground/90">{label}</p>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((requirement) => {
          const competency = competencyOptions.find((option) => option.id === requirement.competencyItemId);
          const level = levelOptions.find((option) => option.id === requirement.minLevelItemId);
          return (
            <span
              key={requirement.competencyItemId}
              className="flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-muted/30 px-3 py-1 text-xs"
            >
              {competency?.name ?? "—"}
              {level ? ` (min. ${level.name})` : ""}
              <button
                type="button"
                aria-label="Usuń kompetencję"
                onClick={() =>
                  onChange(value.filter((entry) => entry.competencyItemId !== requirement.competencyItemId))
                }
              >
                <Trash2 className="h-3 w-3 text-rose-400" />
              </button>
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Kompetencja" className="min-w-[160px] flex-1">
          <Select value={newCompetencyId} onChange={(event) => setNewCompetencyId(event.target.value)}>
            <option value="">Wybierz…</option>
            {competencyOptions
              .filter((option) => !value.some((entry) => entry.competencyItemId === option.id))
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Min. poziom" className="min-w-[140px]">
          <Select value={newLevelId} onChange={(event) => setNewLevelId(event.target.value)}>
            <option value="">Bez wymogu</option>
            {levelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!newCompetencyId}
          onClick={() => {
            onChange([
              ...value,
              {
                competencyItemId: newCompetencyId,
                minLevelItemId: newLevelId || null,
              },
            ]);
            setNewCompetencyId("");
            setNewLevelId("");
          }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Dodaj
        </Button>
      </div>
    </div>
  );
}
