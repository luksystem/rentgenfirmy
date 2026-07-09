"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  ProcessStage,
  ProcessStageCompetencyRequirement,
  ProcessStageRoleRequirement,
} from "@/lib/process/types";
import { useDictionaryStore } from "@/store/dictionary-store";

/**
 * Etap 3 Planu Zasobów — panel wymagań zasobowych etapu procesu (wewnątrz edytora szablonu).
 * Etap procesu jest źródłem prawdy: przy planowaniu system podpowiada te wartości automatycznie.
 */
export function ProcessStageResourcePanel({
  stage,
  otherStages,
  onChange,
}: {
  stage: ProcessStage;
  otherStages: { id: string; title: string }[];
  onChange: (patch: Partial<ProcessStage>) => void;
}) {
  const ensureDictionaries = useDictionaryStore((state) => state.ensure);
  const roleOptions = useDictionaryStore((state) => state.byKey("operational_role"));
  const competencyOptions = useDictionaryStore((state) => state.byKey("competency"));
  const levelOptions = useDictionaryStore((state) => state.byKey("competency_level"));
  const riskOptions = useDictionaryStore((state) => state.byKey("risk_level"));
  const [expanded, setExpanded] = useState(false);
  const [newRoleId, setNewRoleId] = useState("");
  const [newCompetencyId, setNewCompetencyId] = useState("");
  const [newCompetencyLevelId, setNewCompetencyLevelId] = useState("");
  const [newDependencyId, setNewDependencyId] = useState("");

  useEffect(() => {
    void ensureDictionaries();
  }, [ensureDictionaries]);

  const requiredRoles = stage.requiredRoles ?? [];
  const requiredCompetencies = stage.requiredCompetencies ?? [];
  const dependsOnStageIds = stage.dependsOnStageIds ?? [];

  function updateRoles(next: ProcessStageRoleRequirement[]) {
    onChange({ requiredRoles: next });
  }

  function updateCompetencies(next: ProcessStageCompetencyRequirement[]) {
    onChange({ requiredCompetencies: next });
  }

  return (
    <div className="rounded-xl border border-border/70 bg-surface-muted/10">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="text-sm font-medium text-foreground">
          Wymagania zasobowe etapu (Plan Zasobów)
        </span>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted" /> : <ChevronRight className="h-4 w-4 text-muted" />}
      </button>

      {expanded ? (
        <div className="grid gap-4 border-t border-border/60 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Min. liczba osób">
              <Input
                type="number"
                min={1}
                value={stage.minPeopleCount ?? 1}
                onChange={(event) => onChange({ minPeopleCount: Number(event.target.value) || 1 })}
              />
            </Field>
            <Field label="Optymalna liczba osób">
              <Input
                type="number"
                min={0}
                value={stage.optimalPeopleCount ?? ""}
                onChange={(event) =>
                  onChange({ optimalPeopleCount: event.target.value === "" ? null : Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Szacowany czas (dni)">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={stage.estimatedDurationDays ?? ""}
                onChange={(event) =>
                  onChange({ estimatedDurationDays: event.target.value === "" ? null : Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Szacowane roboczogodziny">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={stage.estimatedLaborHours ?? ""}
                onChange={(event) =>
                  onChange({ estimatedLaborHours: event.target.value === "" ? null : Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Domyślny budżet robocizny">
              <Input
                type="number"
                min={0}
                value={stage.defaultLaborBudget ?? ""}
                onChange={(event) =>
                  onChange({ defaultLaborBudget: event.target.value === "" ? null : Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Domyślny budżet materiałów">
              <Input
                type="number"
                min={0}
                value={stage.defaultMaterialBudget ?? ""}
                onChange={(event) =>
                  onChange({ defaultMaterialBudget: event.target.value === "" ? null : Number(event.target.value) })
                }
              />
            </Field>
          </div>

          <Field label="Domyślne ryzyko">
            <Select
              value={stage.defaultRiskItemId ?? ""}
              onChange={(event) => onChange({ defaultRiskItemId: event.target.value || null })}
            >
              <option value="">Brak</option>
              {riskOptions.map((risk) => (
                <option key={risk.id} value={risk.id}>
                  {risk.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={stage.canRunInParallel ?? false}
                onChange={(event) => onChange({ canRunInParallel: event.target.checked })}
              />
              Może być równolegle
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={stage.requiresLeader ?? false}
                onChange={(event) => onChange({ requiresLeader: event.target.checked })}
              />
              Wymaga lidera
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={stage.allowsTrainee ?? true}
                onChange={(event) => onChange({ allowsTrainee: event.target.checked })}
              />
              Może brać udział uczący się
            </label>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium text-foreground/90">Wymagane role</p>
            <div className="flex flex-wrap gap-2">
              {requiredRoles.map((requirement) => {
                const role = roleOptions.find((r) => r.id === requirement.roleItemId);
                return (
                  <span
                    key={requirement.roleItemId}
                    className="flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-muted/30 px-3 py-1 text-xs"
                  >
                    {role?.name ?? "—"} × {requirement.minCount}
                    <button
                      type="button"
                      onClick={() =>
                        updateRoles(requiredRoles.filter((r) => r.roleItemId !== requirement.roleItemId))
                      }
                    >
                      <Trash2 className="h-3 w-3 text-rose-400" />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Rola" className="min-w-[160px] flex-1">
                <Select value={newRoleId} onChange={(event) => setNewRoleId(event.target.value)}>
                  <option value="">Wybierz…</option>
                  {roleOptions
                    .filter((role) => !requiredRoles.some((r) => r.roleItemId === role.id))
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!newRoleId}
                onClick={() => {
                  updateRoles([...requiredRoles, { roleItemId: newRoleId, minCount: 1 }]);
                  setNewRoleId("");
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Dodaj rolę
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium text-foreground/90">Wymagane kompetencje</p>
            <div className="flex flex-wrap gap-2">
              {requiredCompetencies.map((requirement) => {
                const competency = competencyOptions.find((c) => c.id === requirement.competencyItemId);
                const level = levelOptions.find((l) => l.id === requirement.minLevelItemId);
                return (
                  <span
                    key={requirement.competencyItemId}
                    className="flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-muted/30 px-3 py-1 text-xs"
                  >
                    {competency?.name ?? "—"}
                    {level ? ` (min. ${level.name})` : ""}
                    <button
                      type="button"
                      onClick={() =>
                        updateCompetencies(
                          requiredCompetencies.filter((c) => c.competencyItemId !== requirement.competencyItemId),
                        )
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
                    .filter((c) => !requiredCompetencies.some((r) => r.competencyItemId === c.id))
                    .map((competency) => (
                      <option key={competency.id} value={competency.id}>
                        {competency.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Min. poziom" className="min-w-[140px]">
                <Select value={newCompetencyLevelId} onChange={(event) => setNewCompetencyLevelId(event.target.value)}>
                  <option value="">Bez wymogu</option>
                  {levelOptions.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
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
                  updateCompetencies([
                    ...requiredCompetencies,
                    { competencyItemId: newCompetencyId, minLevelItemId: newCompetencyLevelId || null },
                  ]);
                  setNewCompetencyId("");
                  setNewCompetencyLevelId("");
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Dodaj kompetencję
              </Button>
            </div>
          </div>

          {otherStages.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground/90">Zależy od etapów</p>
              <div className="flex flex-wrap gap-2">
                {dependsOnStageIds.map((dependsOnId) => {
                  const dependency = otherStages.find((s) => s.id === dependsOnId);
                  return (
                    <span
                      key={dependsOnId}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-muted/30 px-3 py-1 text-xs",
                      )}
                    >
                      {dependency?.title ?? "—"}
                      <button
                        type="button"
                        onClick={() => onChange({ dependsOnStageIds: dependsOnStageIds.filter((id) => id !== dependsOnId) })}
                      >
                        <Trash2 className="h-3 w-3 text-rose-400" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Etap" className="min-w-[160px] flex-1">
                  <Select value={newDependencyId} onChange={(event) => setNewDependencyId(event.target.value)}>
                    <option value="">Wybierz…</option>
                    {otherStages
                      .filter((s) => !dependsOnStageIds.includes(s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!newDependencyId}
                  onClick={() => {
                    onChange({ dependsOnStageIds: [...dependsOnStageIds, newDependencyId] });
                    setNewDependencyId("");
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Dodaj zależność
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
