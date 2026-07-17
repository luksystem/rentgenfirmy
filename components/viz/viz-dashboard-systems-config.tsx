"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VizIntegratedSystem } from "@/lib/viz/types";

type VizDashboardSystemsConfigProps = {
  dashboardId: string;
};

type SystemDraft = {
  id?: string;
  code: string;
  name: string;
  description: string;
  sortOrder: string;
};

function emptyDraft(sortOrder = 10): SystemDraft {
  return { code: "", name: "", description: "", sortOrder: String(sortOrder) };
}

export function VizDashboardSystemsConfig({ dashboardId }: VizDashboardSystemsConfigProps) {
  const [systems, setSystems] = useState<VizIntegratedSystem[]>([]);
  const [draft, setDraft] = useState<SystemDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSystems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/config?section=systemsCatalog`,
      );
      if (!response.ok) {
        throw new Error("Nie udało się pobrać katalogu systemów.");
      }
      const data = (await response.json()) as { systems: VizIntegratedSystem[] };
      setSystems(data.systems ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void loadSystems();
  }, [loadSystems]);

  function startEdit(system: VizIntegratedSystem) {
    setEditingId(system.id);
    setDraft({
      id: system.id,
      code: system.code,
      name: system.name,
      description: system.description ?? "",
      sortOrder: String(system.sortOrder),
    });
    setMessage(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    const nextSort = systems.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 10;
    setDraft(emptyDraft(nextSort));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const wasEditing = Boolean(editingId);

    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "systemCatalog",
          systemCatalog: {
            id: editingId ?? undefined,
            code: draft.code.trim() || draft.name.trim(),
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            sortOrder: Number(draft.sortOrder) || 0,
            isActive: true,
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się zapisać systemu.");
      }

      setEditingId(null);
      setDraft(emptyDraft());
      setMessage(wasEditing ? "System zaktualizowany." : "System dodany.");
      await loadSystems();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(systemId: string) {
    if (!window.confirm("Usunąć ten system z macierzy dashboardu?")) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/config?section=systemCatalog&id=${encodeURIComponent(systemId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Nie udało się usunąć systemu.");
      }
      if (editingId === systemId) {
        cancelEdit();
      }
      await loadSystems();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    }
  }

  async function handleResetTemplate() {
    if (
      !window.confirm(
        "Przywrócić domyślny katalog systemów? Spowoduje to usunięcie bieżącej listy i skopiowanie szablonu.",
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "resetSystemsCatalog" }),
      });
      if (!response.ok) {
        throw new Error("Nie udało się przywrócić szablonu.");
      }
      cancelEdit();
      setMessage("Przywrócono domyślny katalog systemów.");
      await loadSystems();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Błąd resetu.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie katalogu systemów…
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Katalog systemów macierzy</h2>
            <p className="mt-1 text-sm text-muted">
              Definiuj kategorie wierszy/kolumn macierzy systemów dla tego dashboardu — BMS, HVAC,
              PV, energia itd.
            </p>
          </div>
          <Button type="button" size="sm" variant="secondary" disabled={isSaving} onClick={() => void handleResetTemplate()}>
            <RefreshCw className="h-4 w-4" />
            Przywróć szablon
          </Button>
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nazwa systemu</label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))}
              placeholder="np. Klimatyzacja"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Kod (skrót)</label>
            <Input
              value={draft.code}
              onChange={(e) => setDraft((current) => ({ ...current, code: e.target.value }))}
              placeholder="np. hvac"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Opis (opcjonalnie)</label>
            <Input
              value={draft.description}
              onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Kolejność</label>
            <Input
              type="number"
              value={draft.sortOrder}
              onChange={(e) => setDraft((current) => ({ ...current, sortOrder: e.target.value }))}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={isSaving || !draft.name.trim()}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingId ? "Zapisz zmiany" : "Dodaj system"}
            </Button>
            {editingId ? (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Anuluj
              </Button>
            ) : null}
          </div>
        </form>

        {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">Kolejność</th>
                <th className="px-4 py-3 font-medium">Nazwa</th>
                <th className="px-4 py-3 font-medium">Kod</th>
                <th className="px-4 py-3 font-medium">Opis</th>
                <th className="px-4 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((system) => (
                <tr key={system.id} className="border-b border-border/60">
                  <td className="px-4 py-3 tabular-nums">{system.sortOrder}</td>
                  <td className="px-4 py-3 font-medium">{system.name}</td>
                  <td className="px-4 py-3 text-muted">{system.code}</td>
                  <td className="px-4 py-3 text-muted">{system.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(system)}>
                        Edytuj
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleDelete(system.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!systems.length ? (
          <p className="p-4 text-sm text-muted">Brak systemów — dodaj pierwszą kategorię powyżej.</p>
        ) : null}
      </Card>
    </div>
  );
}
