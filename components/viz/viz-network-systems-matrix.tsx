"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { storeTabHref } from "@/lib/viz/store-tab-slugs";
import {
  pickTopExpansionSystem,
  resolveSystemCellStatus,
  summarizeSystemCoverage,
  systemStatusTone,
} from "@/lib/viz/systems-matrix";
import {
  VIZ_SYSTEM_INTEGRATION_STATUS_LABELS,
  type VizIntegratedSystem,
  type VizProjectSystemStatus,
} from "@/lib/viz/types";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

type VizNetworkSystemsMatrixProps = {
  dashboardId: string;
  snapshots: VizStoreLiveSnapshot[];
};

type MatrixFilter = "all" | "expansion";

export function VizNetworkSystemsMatrix({
  dashboardId,
  snapshots,
}: VizNetworkSystemsMatrixProps) {
  const [systems, setSystems] = useState<VizIntegratedSystem[]>([]);
  const [statuses, setStatuses] = useState<VizProjectSystemStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MatrixFilter>("all");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/config?section=systems`);
      if (!response.ok) {
        throw new Error("Nie udało się pobrać macierzy systemów.");
      }
      const data = (await response.json()) as {
        systems: VizIntegratedSystem[];
        statuses: VizProjectSystemStatus[];
      };
      setSystems(data.systems ?? []);
      setStatuses(data.statuses ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeSystems = useMemo(
    () => systems.filter((system) => system.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [systems],
  );

  const summaries = useMemo(
    () =>
      summarizeSystemCoverage({
        systems: activeSystems,
        snapshots,
        statuses,
      }),
    [activeSystems, snapshots, statuses],
  );

  const topExpansion = useMemo(() => pickTopExpansionSystem(summaries), [summaries]);

  const visibleSystems = useMemo(() => {
    if (filter === "all") {
      return activeSystems;
    }
    return activeSystems.filter((system) => {
      const summary = summaries.find((item) => item.system.id === system.id);
      return (summary?.expansionCount ?? 0) > 0;
    });
  }, [activeSystems, filter, summaries]);

  const totalIntegratedPairs = useMemo(
    () => summaries.reduce((sum, item) => sum + item.integratedCount, 0),
    [summaries],
  );

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie macierzy systemów sieci…
      </Card>
    );
  }

  if (error && !systems.length) {
    return <Card className="p-6 text-sm text-rose-300">{error}</Card>;
  }

  if (!activeSystems.length) {
    return (
      <Card className="p-5 text-sm text-muted">
        Brak kategorii systemów dla tego dashboardu.{" "}
        <Link
          href={`/wizualizacje/${dashboardId}/konfiguracja?sekcja=systemy`}
          className="text-accent hover:underline"
        >
          Skonfiguruj macierz systemów
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Macierz systemów sieci</h2>
          <p className="mt-1 text-sm text-muted">
            Status integracji systemów we wszystkich sklepach dashboardu.
          </p>
          <p className="mt-2 text-sm">
            Zintegrowane pozycje:{" "}
            <span className="font-semibold text-foreground">{totalIntegratedPairs}</span>
            {topExpansion && topExpansion.expansionCount > 0 ? (
              <>
                {" "}
                · Największy potencjał:{" "}
                <span className="font-semibold text-foreground">
                  {topExpansion.system.name} ({topExpansion.expansionCount} sklepów)
                </span>
              </>
            ) : null}
          </p>
          <Link
            href={`/wizualizacje/${dashboardId}/konfiguracja?sekcja=systemy`}
            className="mt-2 inline-block text-xs text-accent hover:underline"
          >
            Edytuj kategorie macierzy
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "secondary"}
            onClick={() => setFilter("all")}
          >
            Wszystkie systemy
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "expansion" ? "default" : "secondary"}
            onClick={() => setFilter("expansion")}
          >
            Potencjał rozbudowy
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium">Sklep</th>
              {visibleSystems.map((system) => (
                <th key={system.id} className="px-3 py-2 font-medium whitespace-nowrap">
                  <span title={system.name}>{system.code.toUpperCase()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snapshots.map((store) => (
              <tr key={store.projectId} className="border-b border-border/60">
                <td className="sticky left-0 z-10 bg-surface px-3 py-3">
                  <Link
                    href={storeTabHref(dashboardId, store.projectId, "Potencjał rozbudowy")}
                    className="font-medium hover:text-accent"
                  >
                    {store.displayName ?? store.projectName}
                  </Link>
                </td>
                {visibleSystems.map((system) => {
                  const status = resolveSystemCellStatus(store.projectId, system.id, statuses);
                  return (
                    <td key={system.id} className="px-3 py-3">
                      <Badge tone={systemStatusTone(status)} className="whitespace-nowrap">
                        {VIZ_SYSTEM_INTEGRATION_STATUS_LABELS[status]}
                      </Badge>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface-muted/30 text-muted">
              <td className="sticky left-0 z-10 bg-surface-muted/30 px-3 py-2 font-medium">
                Pokrycie sieci
              </td>
              {visibleSystems.map((system) => {
                const summary = summaries.find((item) => item.system.id === system.id);
                return (
                  <td key={system.id} className="px-3 py-2 text-xs whitespace-nowrap">
                    {summary
                      ? `${summary.integratedCount}/${summary.storeCount} · ${summary.coveragePercent}%`
                      : "—"}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
