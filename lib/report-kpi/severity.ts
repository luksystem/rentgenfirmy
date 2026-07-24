import type { TrendComparison } from "@/lib/types";
import type { DeltaTone, KpiPolarity, Severity } from "@/lib/report-kpi/types";

/**
 * Progi zawsze działają jako "sufit" (im wyżej, tym gorzej) — to jest znaczenie pola
 * warning_threshold/critical_threshold w konfiguracji admina. Polaryzacja KPI nie wpływa
 * na tę ocenę, tylko na kolor delty (evaluateDeltaTone) — to dwie osobne decyzje.
 */
export function evaluateSeverity(
  value: number,
  warningThreshold: number | null,
  criticalThreshold: number | null,
): Severity {
  if (criticalThreshold !== null && value >= criticalThreshold) {
    return "critical";
  }

  if (warningThreshold !== null && value >= warningThreshold) {
    return "warning";
  }

  return "good";
}

export function evaluateDeltaTone(trend: TrendComparison, polarity: KpiPolarity): DeltaTone {
  if (trend.direction === "same") {
    return "neutral";
  }

  const increased = trend.direction === "up";
  const isGoodChange = polarity === "increase-is-good" ? increased : !increased;

  return isGoodChange ? "good" : "bad";
}

export function worstSeverity(severities: Severity[]): Severity {
  if (severities.includes("critical")) {
    return "critical";
  }

  if (severities.includes("warning")) {
    return "warning";
  }

  return "good";
}
