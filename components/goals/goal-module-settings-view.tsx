"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import type { GoalProjectScope } from "@/lib/goals/module-settings";
import { useGoalStore } from "@/store/goal-store";

export function GoalModuleSettingsView() {
  const hydrated = useGoalStore((state) => state.hydrated);
  const hydrate = useGoalStore((state) => state.hydrate);
  const projectScope = useGoalStore((state) => state.moduleSettings.projectScope);
  const updateModuleSettings = useGoalStore((state) => state.updateModuleSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

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

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie ustawień...
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Wybór projektów w formularzu celu</p>
          <p className="mt-1 text-xs text-muted">
            Decyduje, jakie projekty są dostępne do wyboru przy tworzeniu i przypisywaniu celów do projektu (w tym w
            Asystencie wyznaczania celów).
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
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
