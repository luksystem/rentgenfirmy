"use client";

import { useEffect, useState } from "react";
import {
  FieldOptionsEditor,
  getDefaultOptionsForKey,
} from "@/components/field-options-editor";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_FIELD_OPTIONS,
  INTERRUPTION_FIELD_OPTION_KEYS,
  PROJECT_FIELD_OPTION_KEYS,
  type FieldOptionKey,
  type FieldOptions,
} from "@/lib/field-options";
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

  function updateList(key: FieldOptionKey, items: string[]) {
    setDraft((current) => ({
      ...current,
      [key]: items.map((item) => item.trim()).filter(Boolean),
    }));
    setSaved(false);
  }

  function resetSection(key: FieldOptionKey) {
    setDraft((current) => ({
      ...current,
      [key]: getDefaultOptionsForKey(key),
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
        <Card className="mb-4 border-emerald-200 bg-emerald-50">
          <CardContent className="py-3 text-sm text-emerald-700">
            Ustawienia zostały zapisane.
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Projekty</h2>
          <FieldOptionsEditor
            values={draft}
            keys={PROJECT_FIELD_OPTION_KEYS}
            onChange={updateList}
            onResetSection={resetSection}
          />
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Przerwania</h2>
          <FieldOptionsEditor
            values={draft}
            keys={INTERRUPTION_FIELD_OPTION_KEYS}
            onChange={updateList}
            onResetSection={resetSection}
          />
        </div>
      </section>
    </>
  );
}
