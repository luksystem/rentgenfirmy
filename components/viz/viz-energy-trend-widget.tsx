"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatPercentChange } from "@/lib/viz/energy-comparison";
import type { VizEnergySummary } from "@/lib/viz/energy-types";

type VizEnergyTrendWidgetProps = {
  dashboardId: string;
  projectId?: string;
  compact?: boolean;
};

export function VizEnergyTrendWidget({
  dashboardId,
  projectId,
  compact = false,
}: VizEnergyTrendWidgetProps) {
  const [summary, setSummary] = useState<VizEnergySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ summary: "1" });
      if (projectId) {
        params.set("projectId", projectId);
      }
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/energy?${params}`);
      if (!response.ok) {
        throw new Error("Nie udało się pobrać trendu energii.");
      }
      const data = (await response.json()) as VizEnergySummary;
      setSummary(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId, projectId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const chartRows = useMemo(
    () =>
      (summary?.trend ?? []).map((point) => ({
        label: point.periodEnd.slice(0, 7),
        kwh: point.totalKwh,
        cost: point.totalCostPln ?? 0,
      })),
    [summary?.trend],
  );

  const comparison = useMemo(() => {
    if (!summary?.comparisons.length) {
      return null;
    }
    if (projectId) {
      return summary.comparisons.find((item) => item.projectId === projectId) ?? null;
    }
    return summary.comparisons[0] ?? null;
  }, [projectId, summary?.comparisons]);

  if (isLoading) {
    return (
      <Card className={`flex items-center gap-2 text-sm text-muted ${compact ? "p-4" : "p-6"}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie trendu energii…
      </Card>
    );
  }

  if (error) {
    return <Card className="p-4 text-sm text-rose-300">{error}</Card>;
  }

  if (!summary?.trend.length) {
    return (
      <Card className={`text-sm text-muted ${compact ? "p-4" : "p-6"}`}>
        Brak faktur energii z określonym okresem i zużyciem kWh.
      </Card>
    );
  }

  return (
    <Card className={compact ? "p-4" : "p-5"}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-semibold">Trend energii (faktury)</h3>
          {!compact && comparison?.current ? (
            <p className="mt-1 text-sm text-muted">
              Ostatni okres: {comparison.current.totalKwh.toLocaleString("pl-PL")} kWh
              {comparison.current.totalCostPln != null
                ? ` · ${comparison.current.totalCostPln.toLocaleString("pl-PL")} PLN`
                : null}
            </p>
          ) : null}
        </div>
        {comparison ? (
          <div className="text-right text-sm">
            <p className="text-muted">vs poprzedni okres</p>
            <p>
              kWh:{" "}
              <span className="font-medium text-foreground">
                {formatPercentChange(comparison.kwhChangePercent)}
              </span>
            </p>
            <p>
              koszt:{" "}
              <span className="font-medium text-foreground">
                {formatPercentChange(comparison.costChangePercent)}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <div className={compact ? "h-48" : "h-64"}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="kwh" name="kWh" fill="var(--color-accent, #38bdf8)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
