"use client";

import {
  calculateFixedPriceBreakdown,
} from "@/lib/service/fixed-price";
import type { ServiceDiscounts, ServiceFixedPriceTable } from "@/lib/service/types";
import { formatMoney } from "@/lib/utils";

export function FixedPriceSummaryPanel({
  tables,
  discounts,
  optionalGrossTotal = 0,
}: {
  tables: ServiceFixedPriceTable[];
  discounts: ServiceDiscounts;
  optionalGrossTotal?: number;
}) {
  const breakdown = calculateFixedPriceBreakdown(tables, discounts);
  const grossWithOptional = breakdown.grossTotal + optionalGrossTotal;

  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-surface-muted/40 p-4">
      <h3 className="font-semibold text-foreground">Podsumowanie oferty ryczałtowej</h3>

      <div className="grid gap-1 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted">Suma pozycji przed rabatami</span>
          <span className="font-medium tabular-nums">{formatMoney(breakdown.grossNetTotal)}</span>
        </div>
        {breakdown.rowDiscountAmount > 0 ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted">Rabaty na pozycjach</span>
            <span className="font-medium tabular-nums">−{formatMoney(breakdown.rowDiscountAmount)}</span>
          </div>
        ) : null}
        {breakdown.specialDiscountAmount > 0 ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted">Rabat specjalny</span>
            <span className="font-medium tabular-nums">−{formatMoney(breakdown.specialDiscountAmount)}</span>
          </div>
        ) : null}
        {breakdown.totalDiscountAmount > 0 ? (
          <div className="flex justify-between gap-2 font-medium text-emerald-300/90">
            <span>
              Łączny rabat ({breakdown.totalDiscountPercentOfTotal}% wartości pozycji)
            </span>
            <span className="tabular-nums">−{formatMoney(breakdown.totalDiscountAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 font-semibold">
          <span>Cena netto</span>
          <span className="tabular-nums">{formatMoney(breakdown.netTotal)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted">VAT (wg stawek pozycji / domyślnej {discounts.vatRate}%)</span>
          <span className="font-medium tabular-nums">{formatMoney(breakdown.vatTotal)}</span>
        </div>
        <div className="flex justify-between gap-2 text-base font-semibold text-foreground">
          <span>Brutto oferty</span>
          <span className="tabular-nums">{formatMoney(breakdown.grossTotal)}</span>
        </div>
        {optionalGrossTotal > 0 ? (
          <div className="flex justify-between gap-2 border-t border-border/80 pt-2 text-sm">
            <span className="text-muted">Opcje dodatkowe (max)</span>
            <span className="font-medium tabular-nums">+{formatMoney(optionalGrossTotal)}</span>
          </div>
        ) : null}
        {optionalGrossTotal > 0 ? (
          <div className="flex justify-between gap-2 text-base font-semibold text-foreground">
            <span>Brutto z opcjami</span>
            <span className="tabular-nums">{formatMoney(grossWithOptional)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
