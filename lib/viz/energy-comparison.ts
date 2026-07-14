import type { VizEnergyInvoice } from "@/lib/viz/energy-types";

export type EnergyTrendPoint = {
  invoiceId: string;
  projectId: string;
  periodEnd: string;
  totalKwh: number;
  totalCostPln: number | null;
  unitCostPln: number | null;
  label: string;
};

export type EnergyPeriodComparison = {
  projectId: string;
  current: EnergyTrendPoint | null;
  previous: EnergyTrendPoint | null;
  kwhChangePercent: number | null;
  costChangePercent: number | null;
  unitCostChangePercent: number | null;
};

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function toTrendPoint(invoice: VizEnergyInvoice): EnergyTrendPoint | null {
  if (invoice.totalKwh == null || !invoice.billingPeriodEnd) {
    return null;
  }

  const unitCostPln =
    invoice.totalCostPln != null && invoice.totalKwh > 0
      ? invoice.totalCostPln / invoice.totalKwh
      : null;

  return {
    invoiceId: invoice.id,
    projectId: invoice.projectId,
    periodEnd: invoice.billingPeriodEnd,
    totalKwh: invoice.totalKwh,
    totalCostPln: invoice.totalCostPln,
    unitCostPln,
    label: invoice.documentTitle ?? invoice.billingPeriodEnd,
  };
}

export function buildEnergyTrend(invoices: VizEnergyInvoice[]): EnergyTrendPoint[] {
  return invoices
    .map(toTrendPoint)
    .filter((point): point is EnergyTrendPoint => point != null)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

export function buildEnergyComparisons(invoices: VizEnergyInvoice[]): EnergyPeriodComparison[] {
  const byProject = new Map<string, EnergyTrendPoint[]>();

  for (const point of buildEnergyTrend(invoices)) {
    const list = byProject.get(point.projectId) ?? [];
    list.push(point);
    byProject.set(point.projectId, list);
  }

  const comparisons: EnergyPeriodComparison[] = [];

  for (const [projectId, points] of byProject) {
    const sorted = [...points].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
    const current = sorted[0] ?? null;
    const previous = sorted[1] ?? null;

    comparisons.push({
      projectId,
      current,
      previous,
      kwhChangePercent:
        current && previous ? percentChange(current.totalKwh, previous.totalKwh) : null,
      costChangePercent:
        current?.totalCostPln != null && previous?.totalCostPln != null
          ? percentChange(current.totalCostPln, previous.totalCostPln)
          : null,
      unitCostChangePercent:
        current?.unitCostPln != null && previous?.unitCostPln != null
          ? percentChange(current.unitCostPln, previous.unitCostPln)
          : null,
    });
  }

  return comparisons.sort((a, b) =>
    (b.current?.periodEnd ?? "").localeCompare(a.current?.periodEnd ?? ""),
  );
}

export function formatPercentChange(value: number | null) {
  if (value == null) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
