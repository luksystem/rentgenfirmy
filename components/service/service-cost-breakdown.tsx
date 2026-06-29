import { formatMoney } from "@/lib/utils";
import type { ServiceCostBreakdown, ServiceDiscounts } from "@/lib/service/types";

const CATEGORY_LABELS = {
  car: "Auto (kilometry)",
  carHours: "Godziny w aucie",
  labor: "Praca ludzi",
  materials: "Materiały",
  accommodations: "Noclegi",
} as const;

export function ServiceCostBreakdownPanel({
  title,
  breakdown,
  discounts,
  kilometerZone,
  suggestedCarHours,
}: {
  title: string;
  breakdown: ServiceCostBreakdown;
  discounts: ServiceDiscounts;
  kilometerZone: number;
  suggestedCarHours: number;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-surface-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted">
          Strefa km: {kilometerZone} · Sugerowane h w aucie: {suggestedCarHours}
        </p>
      </div>

      <div className="grid gap-1 text-sm">
        {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((key) => (
          <div key={key} className="flex justify-between gap-2">
            <span className="text-muted">{CATEGORY_LABELS[key]}</span>
            <span className="font-medium tabular-nums">{formatMoney(breakdown.categories[key])}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-1 border-t border-border/80 pt-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted">Suma bez rabatu</span>
          <span className="font-medium">{formatMoney(breakdown.subtotalBeforeDiscount)}</span>
        </div>
        {discounts.percentDiscount > 0 ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted">Rabat praca/logistyka {discounts.percentDiscount}%</span>
            <span className="font-medium">−{formatMoney(breakdown.percentDiscountAmount)}</span>
          </div>
        ) : null}
        {discounts.materialsPercentDiscount > 0 ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted">Rabat sprzęt/materiały {discounts.materialsPercentDiscount}%</span>
            <span className="font-medium">−{formatMoney(breakdown.materialsPercentDiscountAmount)}</span>
          </div>
        ) : null}
        {discounts.specialDiscountPln > 0 ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted">Rabat specjalny</span>
            <span className="font-medium">−{formatMoney(discounts.specialDiscountPln)}</span>
          </div>
        ) : null}
        {breakdown.totalDiscountAmount > 0 ? (
          <div className="flex justify-between gap-2 font-medium text-emerald-300/90">
            <span>Łączny rabat ({breakdown.totalDiscountPercentOfSubtotal}% zlecenia)</span>
            <span>−{formatMoney(breakdown.totalDiscountAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 font-semibold">
          <span>Cena netto</span>
          <span>{formatMoney(breakdown.netTotal)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted">VAT {discounts.vatRate}%</span>
          <span className="font-medium">{formatMoney(breakdown.vatAmount)}</span>
        </div>
        <div className="flex justify-between gap-2 text-base font-semibold text-foreground">
          <span>Cena brutto</span>
          <span>{formatMoney(breakdown.grossTotal)}</span>
        </div>
      </div>
    </div>
  );
}
