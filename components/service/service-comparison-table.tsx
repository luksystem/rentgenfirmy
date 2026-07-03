import { cn, formatMoney } from "@/lib/utils";
import type { ServiceCostBreakdown, ServiceDiscounts } from "@/lib/service/types";

type Row = {
  label: string;
  estimate: number;
  actual: number;
  bold?: boolean;
};

function diffTone(diff: number) {
  if (diff > 0) {
    return "text-rose-400";
  }

  if (diff < 0) {
    return "text-emerald-400";
  }

  return "text-muted";
}

function ComparisonRow({ label, estimate, actual, bold }: Row) {
  const diff = actual - estimate;

  return (
    <tr className={cn(bold && "font-semibold")}>
      <td className="px-3 py-2">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(estimate)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(actual)}</td>
      <td className={cn("px-3 py-2 text-right tabular-nums", diffTone(diff))}>
        {diff >= 0 ? "+" : ""}
        {formatMoney(diff)}
      </td>
    </tr>
  );
}

function ComparisonCard({ label, estimate, actual, bold }: Row) {
  const diff = actual - estimate;

  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm",
        bold && "border-border bg-surface-muted/35 font-semibold",
      )}
    >
      <p className="text-foreground">{label}</p>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted">Wycena</dt>
          <dd className="mt-0.5 tabular-nums">{formatMoney(estimate)}</dd>
        </div>
        <div>
          <dt className="text-muted">Rzeczywiste</dt>
          <dd className="mt-0.5 tabular-nums">{formatMoney(actual)}</dd>
        </div>
        <div>
          <dt className="text-muted">Różnica</dt>
          <dd className={cn("mt-0.5 tabular-nums", diffTone(diff))}>
            {diff >= 0 ? "+" : ""}
            {formatMoney(diff)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function ServiceComparisonTable({
  estimate,
  actual,
  estimateDiscounts,
  actualDiscounts,
}: {
  estimate: ServiceCostBreakdown;
  actual: ServiceCostBreakdown;
  estimateDiscounts: ServiceDiscounts;
  actualDiscounts: ServiceDiscounts;
}) {
  const rows: Row[] = [
    { label: "Auto", estimate: estimate.categories.car, actual: actual.categories.car },
    {
      label: "Godziny w aucie",
      estimate: estimate.categories.carHours,
      actual: actual.categories.carHours,
    },
    { label: "Praca", estimate: estimate.categories.labor, actual: actual.categories.labor },
    {
      label: "Materiały",
      estimate: estimate.categories.materials,
      actual: actual.categories.materials,
    },
    {
      label: "Noclegi",
      estimate: estimate.categories.accommodations,
      actual: actual.categories.accommodations,
    },
    {
      label: "Suma bez rabatu",
      estimate: estimate.subtotalBeforeDiscount,
      actual: actual.subtotalBeforeDiscount,
    },
    {
      label: `Rabat praca/logistyka ${estimateDiscounts.percentDiscount}%`,
      estimate: -estimate.percentDiscountAmount,
      actual: -actual.percentDiscountAmount,
    },
    {
      label: `Rabat sprzęt/materiały ${estimateDiscounts.materialsPercentDiscount}%`,
      estimate: -estimate.materialsPercentDiscountAmount,
      actual: -actual.materialsPercentDiscountAmount,
    },
    {
      label: "Rabat specjalny",
      estimate: -estimateDiscounts.specialDiscountPln,
      actual: -actualDiscounts.specialDiscountPln,
    },
    {
      label: `VAT (${estimateDiscounts.vatRate}% / ${actualDiscounts.vatRate}%)`,
      estimate: estimate.vatAmount,
      actual: actual.vatAmount,
    },
    {
      label: "Razem netto",
      estimate: estimate.netTotal,
      actual: actual.netTotal,
      bold: true,
    },
    {
      label: "Razem brutto",
      estimate: estimate.grossTotal,
      actual: actual.grossTotal,
      bold: true,
    },
  ];

  return (
    <div className="min-w-0 max-w-full">
      <div className="grid gap-2 sm:hidden">
        {rows.map((row) => (
          <ComparisonCard key={row.label} {...row} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-border sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-3">Kategoria</th>
              <th className="px-3 py-3 text-right">Przewidywane netto</th>
              <th className="px-3 py-3 text-right">Rzeczywiste netto</th>
              <th className="px-3 py-3 text-right">Różnica</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => (
              <ComparisonRow key={row.label} {...row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
