import { worstSeverity } from "@/lib/report-kpi/severity";
import type { KpiResult, TileTrend } from "@/lib/report-kpi/types";

/**
 * Kierunek kafelka: dowolny KPI o statusie critical z pogarszającą się deltą przeważa nad
 * wszystkim innym (najpilniejszy sygnał wygrywa remis). W pozostałych przypadkach liczy się
 * przewaga liczbowa dobrych/złych delt; remis lub brak trendów = "stabilnie".
 */
export function computeTileTrend(kpis: KpiResult[]): TileTrend {
  const hasCriticalWorsening = kpis.some(
    (kpi) => kpi.severity === "critical" && kpi.deltaTone === "bad",
  );

  if (hasCriticalWorsening) {
    return "worsening";
  }

  const badCount = kpis.filter((kpi) => kpi.deltaTone === "bad").length;
  const goodCount = kpis.filter((kpi) => kpi.deltaTone === "good").length;

  if (badCount > goodCount) {
    return "worsening";
  }

  if (goodCount > badCount) {
    return "improving";
  }

  return "stable";
}

export function computeTileSeverity(kpis: KpiResult[]) {
  return worstSeverity(kpis.map((kpi) => kpi.severity));
}
