"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { computeFixedPriceRowNetValue } from "@/lib/service/fixed-price";
import type { ServiceFixedPriceRow } from "@/lib/service/types";
import { cn, formatMoney } from "@/lib/utils";

/**
 * Wiersz pozycji w tabeli umowy — jedna pozycja mieści się w jednym rzędzie (na desktopie),
 * zamiast dużej karty jak `ServiceFixedPriceTableRow`. Rabat/opis/aktywność są schowane pod
 * rozwijanym "więcej", żeby domyślny widok tabeli był kompaktowy.
 */
export function ContractRowCompact({
  row,
  onChange,
  onRemove,
  disabled,
}: {
  row: ServiceFixedPriceRow;
  onChange: (row: ServiceFixedPriceRow) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const netValue = computeFixedPriceRowNetValue(row);

  function patch(next: ServiceFixedPriceRow) {
    onChange({ ...next, netValue: computeFixedPriceRowNetValue(next) });
  }

  return (
    <div
      className={cn(
        "rounded-lg border",
        row.active ? "border-border/80 bg-surface-muted/20" : "border-border/50 bg-surface-muted/10 opacity-70",
      )}
    >
      <div className="grid grid-cols-2 items-center gap-2 p-2 sm:grid-cols-[1fr_5rem_4.5rem_6rem_7rem_auto_auto]">
        <Input
          value={row.name}
          disabled={disabled}
          onChange={(event) => onChange({ ...row, name: event.target.value })}
          placeholder="Nazwa pozycji"
          className="col-span-2 h-8 text-sm sm:col-span-1"
        />
        <NumericInput
          value={row.quantity}
          disabled={disabled}
          onChange={(quantity) => patch({ ...row, quantity })}
          className="h-8 text-sm"
          aria-label="Ilość"
        />
        <Input
          value={row.unit}
          disabled={disabled}
          onChange={(event) => onChange({ ...row, unit: event.target.value })}
          placeholder="j.m."
          className="h-8 text-sm"
          aria-label="Jednostka"
        />
        <NumericInput
          value={row.netUnitPrice}
          disabled={disabled}
          onChange={(netUnitPrice) => patch({ ...row, netUnitPrice })}
          className="h-8 text-sm"
          aria-label="Cena netto"
        />
        <p className="col-span-2 text-right text-sm font-medium tabular-nums text-foreground sm:col-span-1">
          {formatMoney(netValue)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 justify-self-end p-0"
          disabled={disabled}
          onClick={() => setExpanded((value) => !value)}
          title="Więcej ustawień"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 justify-self-end p-0 text-rose-400 hover:text-rose-300"
          disabled={disabled}
          onClick={onRemove}
          title="Usuń pozycję"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {expanded ? (
        <div className="grid gap-3 border-t border-border/60 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium text-foreground/90">
              Rabat pozycji (%)
              <NumericInput
                value={row.percentDiscount}
                disabled={disabled}
                onChange={(percentDiscount) =>
                  patch({ ...row, percentDiscount: Math.min(100, Math.max(0, percentDiscount)) })
                }
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={row.active}
                disabled={disabled}
                onChange={(event) => onChange({ ...row, active: event.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Pozycja aktywna
            </label>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={row.showDescription}
              disabled={disabled}
              onChange={(event) => onChange({ ...row, showDescription: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span className="text-muted">Pokaż opis pozycji w umowie</span>
          </label>
          {row.showDescription ? (
            <Textarea
              value={row.description}
              disabled={disabled}
              onChange={(event) => onChange({ ...row, description: event.target.value })}
              rows={2}
              placeholder="Opis pozycji"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
