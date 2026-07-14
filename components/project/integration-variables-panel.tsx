"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IntegrationVariable } from "@/lib/integrations/integration-variable-types";

type IntegrationVariablesPanelProps = {
  integrationId: string;
  canManage: boolean;
};

export function IntegrationVariablesPanel({
  integrationId,
  canManage,
}: IntegrationVariablesPanelProps) {
  const [variables, setVariables] = useState<IntegrationVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", sourceKey: "", locationLabel: "" });

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/integrations/${integrationId}/variables`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Nie udało się pobrać zmiennych.");
      }
      const data = (await response.json()) as { variables: IntegrationVariable[] };
      setVariables(data.variables);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [integrationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!draft.name.trim() || !draft.sourceKey.trim()) {
      setError("Podaj nazwę i identyfikator punktu Loxone.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/integrations/${integrationId}/variables`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          sourceKey: draft.sourceKey.trim(),
          locationLabel: draft.locationLabel.trim() || null,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Błąd dodawania zmiennej.");
      }
      setDraft({ name: "", sourceKey: "", locationLabel: "" });
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(variableId: string) {
    if (!window.confirm("Usunąć zmienną?")) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/integrations/${integrationId}/variables?id=${encodeURIComponent(variableId)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) {
        throw new Error("Nie udało się usunąć zmiennej.");
      }
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border/70 bg-surface/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Zmienne Loxone ({variables.length})
      </p>
      <p className="mt-1 text-xs text-muted">
        Każda zmienna to osobny punkt Miniservera (Virtual Input / IO). Sync odczytuje wszystkie
        aktywne zmienne co 5 minut.
      </p>

      {isLoading ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Ładowanie zmiennych…
        </p>
      ) : variables.length === 0 ? (
        <p className="mt-3 text-xs text-amber-300">Brak zmiennych — dodaj pierwszy punkt odczytu.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {variables.map((variable) => (
            <li
              key={variable.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{variable.name}</p>
                <p className="text-xs text-muted">
                  {variable.sourceKey}
                  {variable.locationLabel ? ` · ${variable.locationLabel}` : ""}
                </p>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={() => void handleDelete(variable.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nazwa (np. Temperatura sklepu)"
          />
          <Input
            value={draft.sourceKey}
            onChange={(e) => setDraft((prev) => ({ ...prev, sourceKey: e.target.value }))}
            placeholder="Punkt Loxone (np. TempSalon)"
          />
          <Input
            value={draft.locationLabel}
            onChange={(e) => setDraft((prev) => ({ ...prev, locationLabel: e.target.value }))}
            placeholder="Lokalizacja (opcjonalnie)"
          />
          <Button type="button" size="sm" disabled={isSaving} onClick={() => void handleAdd()}>
            <Plus className="h-3.5 w-3.5" />
            Dodaj
          </Button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
