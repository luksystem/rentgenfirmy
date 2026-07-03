import { cn, formatMoney } from "@/lib/utils";
import type { ServiceCostBreakdown, ServiceDiscounts } from "@/lib/service/types";

type Row = {
  label: string;
  estimate: number;
  actual: number;
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

function ComparisonRow({ label, estimate, actual, bold }: Row & { bold?: boolean }) {
  const diff = actual - estimate;

  return (
    <tr className={cn(bold && "font-semibold")}>
      <td className="px-2 py-2 sm:px-3">{label}</td>
      <td className="px-2 py-2 text-right tabular-nums sm:px-3">{formatMoney(estimate)}</td>
      <td className="px-2 py-2 text-right tabular-nums sm:px-3">{formatMoney(actual)}</td>
      <td className={cn("px-2 py-2 text-right tabular-nums sm:px-3", diffTone(diff))}>
        {diff >= 0 ? "+" : ""}
        {formatMoney(diff)}
      </td>
    </tr>
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
  ];

  return (
    <div className="max-w-full overflow-x-auto rounded-2xl border border-border [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[520px] text-left text-xs sm:min-w-[640px] sm:text-sm">
        <thead className="bg-surface-muted text-[10px] uppercase tracking-wide text-muted sm:text-xs">
          <tr>
            <th className="px-2 py-2 sm:px-3 sm:py-3">Kategoria</th>
            <th className="px-2 py-2 text-right sm:px-3 sm:py-3">Przewidywane netto</th>
            <th className="px-2 py-2 text-right sm:px-3 sm:py-3">Rzeczywiste netto</th>
            <th className="px-2 py-2 text-right sm:px-3 sm:py-3">Różnica</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row) => (
            <ComparisonRow key={row.label} {...row} />
          ))}
          <ComparisonRow
            label="Suma bez rabatu"
            estimate={estimate.subtotalBeforeDiscount}
            actual={actual.subtotalBeforeDiscount}
          />
          <ComparisonRow
            label={`Rabat praca/logistyka ${estimateDiscounts.percentDiscount}%`}
            estimate={-estimate.percentDiscountAmount}
            actual={-actual.percentDiscountAmount}
          />
          <ComparisonRow
            label={`Rabat sprzęt/materiały ${estimateDiscounts.materialsPercentDiscount}%`}
            estimate={-estimate.materialsPercentDiscountAmount}
            actual={-actual.materialsPercentDiscountAmount}
          />
          <ComparisonRow
            label="Rabat specjalny"
            estimate={-estimateDiscounts.specialDiscountPln}
            actual={-actualDiscounts.specialDiscountPln}
          />
          <ComparisonRow
            label={`VAT (${estimateDiscounts.vatRate}% / ${actualDiscounts.vatRate}%)`}
            estimate={estimate.vatAmount}
            actual={actual.vatAmount}
          />
          <ComparisonRow
            label="Razem netto"
            estimate={estimate.netTotal}
            actual={actual.netTotal}
            bold
          />
          <ComparisonRow
            label="Razem brutto"
            estimate={estimate.grossTotal}
            actual={actual.grossTotal}
            bold
          />
        </tbody>
      </table>
    </div>
  );
}
