"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  VIZ_SYSTEM_INTEGRATION_STATUSES,
  VIZ_SYSTEM_INTEGRATION_STATUS_LABELS,
  type VizIntegratedSystem,
  type VizProjectSystemStatus,
  type VizSystemIntegrationStatus,
} from "@/lib/viz/types";
import { useVizStore } from "@/store/viz-store";

const selectClassName =
  "h-9 w-full rounded-lg border border-border bg-surface-muted px-2 text-sm";

type VizStoreSystemsPanelProps = {
  dashboardId: string;
  projectId: string;
  canEdit: boolean;
};

export function VizStoreSystemsPanel({
  dashboardId,
  projectId,
  canEdit,
}: VizStoreSystemsPanelProps) {
  const systems = useVizStore((s) => s.systems);
  const ensureViz = useVizStore((s) => s.hydrate);
  const [statuses, setStatuses] = useState<VizProjectSystemStatus[]>([]);
  const [draft, setDraft] = useState<Record<string, VizSystemIntegrationStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatuses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/config?section=systems&projectId=${encodeURIComponent(projectId)}`,
      );
      if (!response.ok) {
        throw new Error("Nie udało się pobrać statusów systemów.");
      }
      const data = (await response.json()) as { statuses: VizProjectSystemStatus[] };
      setStatuses(data.statuses);
      const nextDraft: Record<string, VizSystemIntegrationStatus> = {};
      for (const system of systems) {
        const existing = data.statuses.find((item) => item.systemId === system.id);
        nextDraft[system.id] = existing?.status ?? "none";
      }
      setDraft(nextDraft);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId, projectId, systems]);

  useEffect(() => {
    void ensureViz();
  }, [ensureViz]);

  useEffect(() => {
    if (systems.length) {
      void loadStatuses();
    }
  }, [loadStatuses, systems.length]);

  const integratedCount = useMemo(
    () =>
      Object.values(draft).filter(
        (status) => status === "integrated" || status === "partially_integrated",
      ).length,
    [draft],
  );

  async function saveSystem(system: VizIntegratedSystem) {
    if (!canEdit) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "system",
          system: {
            projectId,
            systemId: system.id,
            status: draft[system.id] ?? "none",
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Błąd zapisu statusu systemu.");
      }

      const data = (await response.json()) as { status: VizProjectSystemStatus };
      setStatuses((prev) => {
        const without = prev.filter((item) => item.systemId !== system.id);
        return [...without, data.status];
      });
      setMessage(`Zapisano status: ${system.name}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie macierzy systemów…
      </Card>
    );
  }

  if (error && !statuses.length) {
    return <Card className="p-6 text-sm text-rose-300">{error}</Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold">Potencjał rozbudowy BMS</h3>
        <p className="mt-2 text-sm text-muted">
          Macierz integracji systemów technicznych dla sklepu — HVAC, PV, pomiar energii, EV itd.
        </p>
        <p className="mt-3 text-sm">
          Zintegrowane / częściowo:{" "}
          <span className="font-semibold text-foreground">{integratedCount}</span> z{" "}
          {systems.length}
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">System</th>
                <th className="px-4 py-3 font-medium">Status integracji</th>
                {canEdit ? <th className="px-4 py-3 font-medium">Akcja</th> : null}
              </tr>
            </thead>
            <tbody>
              {systems.map((system) => (
                <tr key={system.id} className="border-b border-border/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{system.name}</p>
                    <p className="text-xs text-muted">{system.code}</p>
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <select
                        className={selectClassName}
                        value={draft[system.id] ?? "none"}
                        onChange={(event) =>
                          setDraft((prev) => ({
                            ...prev,
                            [system.id]: event.target.value as VizSystemIntegrationStatus,
                          }))
                        }
                      >
                        {VIZ_SYSTEM_INTEGRATION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {VIZ_SYSTEM_INTEGRATION_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      VIZ_SYSTEM_INTEGRATION_STATUS_LABELS[draft[system.id] ?? "none"]
                    )}
                  </td>
                  {canEdit ? (
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isSaving}
                        onClick={() => void saveSystem(system)}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Zapisz
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
