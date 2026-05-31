"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  FieldOptionsEditor,
  FlowStatusesOptionsEditor,
  InterruptionTypesOptionsEditor,
  StagesOptionsEditor,
  getDefaultFlowStatusOptions,
  getDefaultInterruptionTypeOptions,
  getDefaultOptionsForKey,
  getDefaultStageOptions,
} from "@/components/field-options-editor";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_FIELD_OPTIONS,
  PROJECT_STRING_FIELD_OPTION_KEYS,
  type FieldOptions,
  type StringListFieldOptionKey,
} from "@/lib/field-options";
import { PROJECT_RULES } from "@/lib/project-rules";
import { useAppStore } from "@/store/app-store";

export default function SettingsPage() {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const updateFieldOptions = useAppStore((state) => state.updateFieldOptions);
  const isSaving = useAppStore((state) => state.isSaving);
  const [draft, setDraft] = useState<FieldOptions>(fieldOptions);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(fieldOptions);
  }, [fieldOptions]);

  function updateList(key: StringListFieldOptionKey, items: string[]) {
    setDraft((current) => ({
      ...current,
      [key]: items.map((item) => item.trim()).filter(Boolean),
    }));
    setSaved(false);
  }

  function updateFlowStatuses(statuses: FieldOptions["flowStatuses"]) {
    setDraft((current) => ({
      ...current,
      flowStatuses: statuses
        .map((status) => ({
          name: status.name.trim(),
          isInProgress: status.isInProgress,
          isClosed: status.isClosed,
          isWaiting: status.isWaiting,
        }))
        .filter((status) => status.name),
    }));
    setSaved(false);
  }

  function updateStages(stages: FieldOptions["implementationStages"]) {
    setDraft((current) => ({
      ...current,
      implementationStages: stages
        .map((stage) => ({
          name: stage.name.trim(),
          forClosing: stage.forClosing,
        }))
        .filter((stage) => stage.name),
    }));
    setSaved(false);
  }

  function updateInterruptionTypes(types: FieldOptions["interruptionTypes"]) {
    setDraft((current) => ({
      ...current,
      interruptionTypes: types
        .map((item) => ({
          name: item.name.trim(),
          suggestion: item.suggestion.trim(),
        }))
        .filter((item) => item.name),
    }));
    setSaved(false);
  }

  function resetInterruptionTypes() {
    setDraft((current) => ({
      ...current,
      interruptionTypes: getDefaultInterruptionTypeOptions(),
    }));
    setSaved(false);
  }

  function resetSection(key: StringListFieldOptionKey) {
    setDraft((current) => ({
      ...current,
      [key]: getDefaultOptionsForKey(key),
    }));
    setSaved(false);
  }

  function resetFlowStatuses() {
    setDraft((current) => ({
      ...current,
      flowStatuses: getDefaultFlowStatusOptions(),
    }));
    setSaved(false);
  }

  function resetStages() {
    setDraft((current) => ({
      ...current,
      implementationStages: getDefaultStageOptions(),
    }));
    setSaved(false);
  }

  async function handleSave() {
    await updateFieldOptions(draft);
    setSaved(true);
  }

  function handleResetAll() {
    setDraft(DEFAULT_FIELD_OPTIONS);
    setSaved(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Konfiguracja"
        title="Ustawienia pól"
        description="Edytuj listy rozwijane używane w projektach i przerwaniach. Zmiany zapisują się w Supabase i obowiązują dla całego zespołu."
        action={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button variant="secondary" onClick={handleResetAll} disabled={isSaving}>
              Przywróć wszystkie domyślne
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Zapisywanie..." : "Zapisz ustawienia"}
            </Button>
          </div>
        }
      />

      {saved ? (
        <Card className="panel-success mb-4 border">
          <CardContent className="py-3 text-sm text-emerald-700">
            Ustawienia zostały zapisane.
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6 border border-border bg-surface-muted">
        <CardContent className="grid gap-3 py-4 text-sm text-muted">
          <p className="font-semibold text-foreground">Zależności flag</p>
          <ul className="grid list-disc gap-2 pl-5">
            <li>
              <strong>Status przepływu</strong> — kategoria: W trakcie / Oczekujące / Zamknięty
              (ustawiana poniżej).
            </li>
            <li>
              <strong>Aktywny</strong> (checkbox w projekcie) — {PROJECT_RULES.activeField}
            </li>
            <li>
              <strong>Do zamknięcia</strong> — {PROJECT_RULES.closingView}
            </li>
            <li>
              <strong>Oczekujące</strong> (widok) — {PROJECT_RULES.waitingView}
            </li>
            <li>
              <strong>Bez kontaktu</strong> — {PROJECT_RULES.noContactView}
            </li>
          </ul>
        </CardContent>
      </Card>

      <section className="grid gap-6">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Projekty</h2>
          <FieldOptionsEditor
            values={draft}
            keys={PROJECT_STRING_FIELD_OPTION_KEYS}
            onChange={updateList}
            onResetSection={resetSection}
          />

          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={resetFlowStatuses}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Przywróć domyślne statusy
                </Button>
              </div>
              <FlowStatusesOptionsEditor
                items={draft.flowStatuses}
                onChange={updateFlowStatuses}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={resetStages}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Przywróć domyślne etapy
                </Button>
              </div>
              <StagesOptionsEditor
                items={draft.implementationStages}
                onChange={updateStages}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Przerwania</h2>
          <div className="grid gap-2">
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={resetInterruptionTypes}>
                <RotateCcw className="h-3.5 w-3.5" />
                Przywróć domyślne typy
              </Button>
            </div>
            <InterruptionTypesOptionsEditor
              items={draft.interruptionTypes}
              onChange={updateInterruptionTypes}
            />
          </div>
        </div>
      </section>
    </>
  );
}
