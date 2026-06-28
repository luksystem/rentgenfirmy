"use client";

import { useEffect, useState } from "react";
import {
  BlockerReasonsOptionsEditor,
  FieldOptionsEditor,
  FlowStatusesOptionsEditor,
  InterruptionTypesOptionsEditor,
  StagesOptionsEditor,
} from "@/components/field-options-editor";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
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

  function updateBlockerReasons(reasons: FieldOptions["blockerReasons"]) {
    setDraft((current) => ({
      ...current,
      blockerReasons: reasons
        .map((item) => ({
          name: item.name.trim(),
          isInternal: item.isInternal,
          isExternal: item.isExternal,
        }))
        .filter((item) => item.name),
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

  async function handleSave() {
    await updateFieldOptions(draft);
    setSaved(true);
  }


  return (
    <>
      <PageHeader
        eyebrow="Konfiguracja"
        title="Ustawienia pól"
        description="Edytuj listy rozwijane używane w projektach i przerwaniach. Zmiany zapisują się w Supabase i obowiązują dla całego zespołu."
        action={
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Zapisywanie..." : "Zapisz ustawienia"}
          </Button>
        }
      />

      {saved ? (
        <Card className="panel-success mb-4 border">
          <CardContent className="py-3 text-sm text-emerald-300">
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
            <li>
              <strong>Powód blokady</strong> — {PROJECT_RULES.blockerFault}
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
          />

          <div className="mt-4 grid gap-4">
            <BlockerReasonsOptionsEditor
              items={draft.blockerReasons}
              onChange={updateBlockerReasons}
            />

            <FlowStatusesOptionsEditor
              items={draft.flowStatuses}
              onChange={updateFlowStatuses}
            />

            <StagesOptionsEditor
              items={draft.implementationStages}
              onChange={updateStages}
            />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Przerwania</h2>
          <InterruptionTypesOptionsEditor
            items={draft.interruptionTypes}
            onChange={updateInterruptionTypes}
          />
        </div>
      </section>
    </>
  );
}
