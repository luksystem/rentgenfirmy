"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import {
  slugifyReviewOutcomeId,
  type GoalProjectScope,
  type GoalReviewOutcomeOption,
} from "@/lib/goals/module-settings";
import { useGoalStore } from "@/store/goal-store";

export function GoalModuleSettingsView() {
  const hydrated = useGoalStore((state) => state.hydrated);
  const hydrate = useGoalStore((state) => state.hydrate);
  const projectScope = useGoalStore((state) => state.moduleSettings.projectScope);
  const reviewOutcomes = useGoalStore((state) => state.moduleSettings.reviewOutcomes);
  const updateModuleSettings = useGoalStore((state) => state.updateModuleSettings);
  const [draftOutcomes, setDraftOutcomes] = useState<GoalReviewOutcomeOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingOutcomes, setSavingOutcomes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomesSaved, setOutcomesSaved] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    setDraftOutcomes(reviewOutcomes.map((entry) => ({ ...entry })));
  }, [reviewOutcomes]);

  async function handleProjectScopeChange(next: GoalProjectScope) {
    setSaving(true);
    setError(null);
    try {
      await updateModuleSettings({ projectScope: next });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać ustawień.");
    } finally {
      setSaving(false);
    }
  }

  function updateOutcomeLabel(index: number, label: string) {
    setOutcomesSaved(false);
    setDraftOutcomes((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, label } : entry)),
    );
  }

  function removeOutcome(index: number) {
    if (draftOutcomes.length <= 1) return;
    setOutcomesSaved(false);
    setDraftOutcomes((current) => current.filter((_, entryIndex) => entryIndex !== index));
  }

  function addOutcome() {
    setOutcomesSaved(false);
    setDraftOutcomes((current) => {
      const existingIds = new Set(current.map((entry) => entry.id));
      const id = slugifyReviewOutcomeId("nowy_wynik", existingIds);
      return [...current, { id, label: "" }];
    });
  }

  async function handleSaveOutcomes() {
    const cleaned = draftOutcomes
      .map((entry) => ({ id: entry.id.trim(), label: entry.label.trim() }))
      .filter((entry) => entry.label.length > 0);

    if (cleaned.length === 0) {
      setError("Dodaj co najmniej jedną opcję wyniku przeglądu.");
      return;
    }

    const seen = new Set<string>();
    const normalized: GoalReviewOutcomeOption[] = [];
    for (const entry of cleaned) {
      let id = entry.id;
      if (!id || seen.has(id)) {
        id = slugifyReviewOutcomeId(entry.label, seen);
      }
      seen.add(id);
      normalized.push({ id, label: entry.label });
    }

    setSavingOutcomes(true);
    setError(null);
    setOutcomesSaved(false);
    try {
      await updateModuleSettings({ reviewOutcomes: normalized });
      setOutcomesSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać opcji wyniku.");
    } finally {
      setSavingOutcomes(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie ustawień...
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Wybór projektów w formularzu celu</p>
            <p className="mt-1 text-xs text-muted">
              Decyduje, jakie projekty są dostępne do wyboru przy tworzeniu i przypisywaniu celów do
              projektu (w tym w Asystencie wyznaczania celów).
            </p>
          </div>
          <Field label="Zakres projektów" className="max-w-sm">
            <Select
              value={projectScope}
              disabled={saving}
              onChange={(event) => void handleProjectScopeChange(event.target.value as GoalProjectScope)}
            >
              <option value="active">Tylko aktywne projekty</option>
              <option value="all">Wszystkie projekty w systemie</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Wynik przeglądu względem kryteriów
            </p>
            <p className="mt-1 text-xs text-muted">
              Opcje dostępne w przeglądzie celów (spotkanie przeglądowe i zakładka Przeglądy). Identyfikatory
              opcji są stałe po utworzeniu — zmieniaj etykiety, żeby zachować historię.
            </p>
          </div>

          <div className="grid gap-2">
            {draftOutcomes.map((entry, index) => (
              <div key={entry.id} className="flex min-w-0 flex-wrap items-end gap-2">
                <Field label={index === 0 ? "Etykieta opcji" : " "} className="min-w-0 flex-1">
                  <Input
                    value={entry.label}
                    placeholder="np. Zgodnie z planem"
                    onChange={(event) => updateOutcomeLabel(index, event.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                  disabled={draftOutcomes.length <= 1 || savingOutcomes}
                  onClick={() => removeOutcome(index)}
                  title="Usuń opcję"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={addOutcome} disabled={savingOutcomes}>
              <Plus className="mr-1.5 h-4 w-4" />
              Dodaj opcję
            </Button>
            <Button type="button" size="sm" onClick={() => void handleSaveOutcomes()} disabled={savingOutcomes}>
              {savingOutcomes ? "Zapisywanie…" : "Zapisz opcje wyniku"}
            </Button>
            {outcomesSaved ? <span className="text-xs text-emerald-300">Zapisano.</span> : null}
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
