import type { TrendComparison } from "@/lib/types";
import type { DeltaTone, KpiPolarity, Severity } from "@/lib/report-kpi/types";

/**
 * Domyślnie (increase-is-bad) progi działają jako "sufit" — im wyżej, tym gorzej
 * (np. zadania przeterminowane). Dla increase-is-good progi działają jako "podłoga" —
 * im niżej, tym gorzej (np. prognozowane saldo gotówkowe: admin ustawia próg jako
 * minimum, nie maksimum). To jedyny wpływ polaryzacji na severity — sam kierunek
 * porównania z progiem; kolor delty to osobna decyzja (evaluateDeltaTone).
 */
export function evaluateSeverity(
  value: number,
  warningThreshold: number | null,
  criticalThreshold: number | null,
  polarity: KpiPolarity = "increase-is-bad",
): Severity {
  if (polarity === "increase-is-good") {
    if (criticalThreshold !== null && value <= criticalThreshold) {
      return "critical";
    }
    if (warningThreshold !== null && value <= warningThreshold) {
      return "warning";
    }
    return "good";
  }

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
