"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VIZ_DATA_QUALITY_LABELS, type VizVariableMapping } from "@/lib/viz/types";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

type VizStoreVariablesPanelProps = {
  dashboardId: string;
  projectId: string;
  snapshot: VizStoreLiveSnapshot | null;
  isLoadingSnapshot: boolean;
};

export function VizStoreVariablesPanel({
  dashboardId,
  projectId,
  snapshot,
  isLoadingSnapshot,
}: VizStoreVariablesPanelProps) {
  const [mappings, setMappings] = useState<VizVariableMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMappings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/config?section=mappings&projectId=${encodeURIComponent(projectId)}`,
      );
      if (!response.ok) {
        throw new Error("Nie udało się pobrać mapowań zmiennych.");
      }
      const data = (await response.json()) as { mappings: VizVariableMapping[] };
      setMappings(data.mappings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId, projectId]);

  useEffect(() => {
    void loadMappings();
  }, [loadMappings]);

  if (isLoading || isLoadingSnapshot) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie zmiennych…
      </Card>
    );
  }

  if (error) {
    return <Card className="p-6 text-sm text-rose-300">{error}</Card>;
  }

  if (!mappings.length) {
    return (
      <Card className="p-6 text-sm text-muted">
        Brak mapowań zmiennych dla tego sklepu.{" "}
        <Link
          href={`/wizualizacje/${dashboardId}/projekty`}
          className="text-accent hover:underline"
        >
          Skonfiguruj w Projekty i zmienne
        </Link>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-sm text-muted">
        Bieżące wartości z mapowań BMS — odczyt z ostatniego sync telemetrii.
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3 font-medium">Rola</th>
              <th className="px-4 py-3 font-medium">Źródło Loxone</th>
              <th className="px-4 py-3 font-medium">Wartość</th>
              <th className="px-4 py-3 font-medium">Jakość</th>
              <th className="px-4 py-3 font-medium">Ostatni odczyt</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => {
              const live = snapshot?.roles[mapping.roleCode];
              return (
                <tr key={mapping.id} className="border-b border-border/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{mapping.roleName ?? mapping.roleCode}</p>
                    {mapping.displayName ? (
                      <p className="text-xs text-muted">{mapping.displayName}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {mapping.variableName ?? mapping.variableSourceKey ?? mapping.sourceKey ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{live?.displayValue ?? "—"}</td>
                  <td className="px-4 py-3">
                    {live ? (
                      <Badge tone={live.dataQuality === "valid" ? "active" : "waiting"}>
                        {VIZ_DATA_QUALITY_LABELS[live.dataQuality]}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {live?.measuredAt
                      ? new Date(live.measuredAt).toLocaleString("pl-PL")
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
