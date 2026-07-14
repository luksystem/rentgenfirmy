"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { VizChartRenderer } from "@/components/viz/viz-chart-renderer";
import type { VizDashboardChart } from "@/lib/viz/chart-types";

type VizStoreChartsPanelProps = {
  dashboardId: string;
  projectId: string;
};

function chartIncludesProject(chart: VizDashboardChart, projectId: string) {
  return !chart.config.projectIds.length || chart.config.projectIds.includes(projectId);
}

function chartForProject(chart: VizDashboardChart, projectId: string): VizDashboardChart {
  const config = {
    ...chart.config,
    projectIds: chart.config.projectIds.includes(projectId)
      ? [projectId]
      : [projectId],
    roleCodes: chart.config.roleCodes?.length
      ? chart.config.roleCodes
      : chart.config.roleCode
        ? [chart.config.roleCode]
        : ["store_temperature"],
  };

  return {
    ...chart,
    config,
  };
}

export function VizStoreChartsPanel({ dashboardId, projectId }: VizStoreChartsPanelProps) {
  const [charts, setCharts] = useState<VizDashboardChart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCharts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/charts`);
      if (!response.ok) {
        throw new Error("Nie udało się pobrać wykresów.");
      }
      const data = (await response.json()) as { charts: VizDashboardChart[] };
      setCharts(data.charts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  const projectCharts = useMemo(
    () =>
      charts
        .filter((chart) => chartIncludesProject(chart, projectId))
        .map((chart) => chartForProject(chart, projectId)),
    [charts, projectId],
  );

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie wykresów…
      </Card>
    );
  }

  if (error) {
    return <Card className="p-6 text-sm text-rose-300">{error}</Card>;
  }

  if (!projectCharts.length) {
    return (
      <Card className="p-6 text-sm text-muted">
        Brak wykresów przypisanych do tego sklepu.{" "}
        <Link href={`/wizualizacje/${dashboardId}/wykresy`} className="text-accent hover:underline">
          Dodaj wykres w konfiguratorze
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Wykresy globalne dashboardu zawężone do tego sklepu (lub skonfigurowane bezpośrednio dla
        projektu).
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        {projectCharts.map((chart) => (
          <VizChartRenderer key={chart.id} dashboardId={dashboardId} chart={chart} />
        ))}
      </div>
    </div>
  );
}
