import { formatMoney } from "@/lib/utils";
import {
  createDayPeriod,
  createQuarterPeriod,
  createThisMonthPeriod,
  createWeeklyPeriod,
  createYearPeriod,
  previousPeriod,
  shiftMonths,
  type ReportPeriod,
} from "@/lib/report-period";
import type { TrendComparison } from "@/lib/types";
import { evaluateDeltaTone, evaluateSeverity } from "@/lib/report-kpi/severity";
import type {
  ComparisonPeriodKind,
  KpiDefinition,
  KpiResult,
  KpiUnit,
  ReportKpiConfigRow,
} from "@/lib/report-kpi/types";

/**
 * Kanoniczna implementacja porównania dwóch liczb — przeniesiona tu z lib/report-insights.ts,
 * które re-eksportuje ją bez zmian dla wstecznej kompatybilności istniejących importów
 * (np. components/report-content.tsx importuje formatTrendHelper z report-insights).
 */
export function compareCounts(current: number, previous: number): TrendComparison {
  const delta = current - previous;

  return {
    current,
    previous,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
    percentChange:
      previous === 0 ? (current === 0 ? 0 : null) : Math.round((delta / previous) * 100),
  };
}

export function formatTrendHelper(trend: TrendComparison, periodLabel: string) {
  if (trend.current === 0 && trend.previous === 0) {
    return `Brak przerwań: ${periodLabel}`;
  }

  const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  const deltaLabel =
    trend.delta === 0
      ? "bez zmiany"
      : `${arrow} ${Math.abs(trend.delta)} (${trend.delta > 0 ? "więcej" : "mniej"})`;

  const percentLabel =
    trend.percentChange !== null && trend.previous > 0
      ? `, ${trend.percentChange > 0 ? "+" : ""}${trend.percentChange}%`
      : "";

  return `${deltaLabel} vs ${periodLabel}${percentLabel}`;
}

/**
 * Okno bieżące/poprzednie dla danego rodzaju okresu odniesienia. Dzień i tydzień mają stałą
 * długość, więc korzystają z generycznego previousPeriod (przesunięcie o tyle samo dni).
 * Miesiąc/kwartał/rok przesuwają się kalendarzowo (shiftMonths), żeby "miesiąc do miesiąca"
 * znaczyło rzeczywiście poprzedni miesiąc kalendarzowy, a nie "N dni wstecz".
 */
export function resolveComparisonWindow(
  asOf: Date,
  kind: Exclude<ComparisonPeriodKind, "none">,
): { current: ReportPeriod; previous: ReportPeriod } {
  switch (kind) {
    case "day": {
      const current = createDayPeriod(asOf);
      return { current, previous: previousPeriod(current) };
    }
    case "week": {
      const current = createWeeklyPeriod(asOf);
      return { current, previous: previousPeriod(current) };
    }
    case "month": {
      const current = createThisMonthPeriod(asOf);
      const previous = createThisMonthPeriod(shiftMonths(asOf, -1));
      return { current, previous };
    }
    case "quarter": {
      const current = createQuarterPeriod(asOf);
      const previous = createQuarterPeriod(shiftMonths(asOf, -3));
      return { current, previous };
    }
    case "year": {
      const current = createYearPeriod(asOf);
      const previous = createYearPeriod(shiftMonths(asOf, -12));
      return { current, previous };
    }
  }
}

export function formatKpiValue(value: number, unit: KpiUnit): string {
  switch (unit) {
    case "currency":
      return formatMoney(value);
    case "hours":
      return `${value} h`;
    case "percent":
      return `${value}%`;
    case "count":
    default:
      return `${value}`;
  }
}

export function computeKpiResult(params: {
  value: number;
  previousValue: number | null;
  config: ReportKpiConfigRow;
  definition: KpiDefinition;
}): KpiResult {
  const { value, previousValue, config, definition } = params;

  const trend = previousValue === null ? null : compareCounts(value, previousValue);
  const severity = evaluateSeverity(value, config.warningThreshold, config.criticalThreshold);
  const deltaTone = trend ? evaluateDeltaTone(trend, definition.polarity) : "neutral";

  return {
    key: definition.key,
    label: config.label,
    value,
    displayValue: formatKpiValue(value, definition.unit),
    trend,
    severity,
    deltaTone,
  };
}
