"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  computeFixedPriceRowNetValue,
} from "@/lib/service/fixed-price";
import { VAT_RATES, type ServiceFixedPriceRow, type VatRate } from "@/lib/service/types";
import { cn, formatMoney } from "@/lib/utils";

export function ServiceFixedPriceTableRow({
  row,
  index,
  showProductDescriptions,
  onChange,
  onRemove,
  disabled,
}: {
  row: ServiceFixedPriceRow;
  index: number;
  showProductDescriptions: boolean;
  onChange: (row: ServiceFixedPriceRow) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const netValue = computeFixedPriceRowNetValue(row);

  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border p-4",
        row.active ? "border-border/80 bg-surface-muted/20" : "border-border/50 bg-surface-muted/10 opacity-70",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Pozycja {index + 1}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={row.active}
              disabled={disabled}
              onChange={(event) => onChange({ ...row, active: event.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            Aktywna
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
            Usuń
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nazwa" className="sm:col-span-2">
          <Input
            value={row.name}
            disabled={disabled}
            onChange={(event) => onChange({ ...row, name: event.target.value })}
            placeholder="Np. Montaż sterownika"
          />
        </Field>
        <Field label="Ilość">
          <NumericInput
            value={row.quantity}
            disabled={disabled}
            onChange={(quantity) =>
              onChange({
                ...row,
                quantity,
                netValue: computeFixedPriceRowNetValue({ quantity, netUnitPrice: row.netUnitPrice }),
              })
            }
          />
        </Field>
        <Field label="Jednostka">
          <Input
            value={row.unit}
            disabled={disabled}
            onChange={(event) => onChange({ ...row, unit: event.target.value })}
          />
        </Field>
        <Field label="Cena netto / j.m.">
          <NumericInput
            value={row.netUnitPrice}
            disabled={disabled}
            onChange={(netUnitPrice) =>
              onChange({
                ...row,
                netUnitPrice,
                netValue: computeFixedPriceRowNetValue({ quantity: row.quantity, netUnitPrice }),
              })
            }
          />
        </Field>
        <Field label="VAT pozycji">
          <Select
            value={row.vatRate === null ? "" : String(row.vatRate)}
            disabled={disabled}
            onChange={(event) => {
              const raw = event.target.value;
              onChange({
                ...row,
                vatRate: raw === "" ? null : (Number(raw) as VatRate),
              });
            }}
          >
            <option value="">Domyślna oferty</option>
            {VAT_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}%
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={row.showDescription}
          disabled={disabled}
          onChange={(event) => onChange({ ...row, showDescription: event.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-border"
        />
        <span className="text-muted">Pokaż opis produktu w ofercie dla klienta</span>
      </label>

      {row.showDescription || showProductDescriptions ? (
        <Field label="Opis">
          <Textarea
            value={row.description}
            disabled={disabled}
            onChange={(event) => onChange({ ...row, description: event.target.value })}
            rows={2}
          />
        </Field>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        title="Wkrótce"
        className="justify-start"
      >
        Wybierz produkt z bazy (wkrótce)
      </Button>

      <p className="text-sm text-muted">
        Wartość netto: <span className="font-semibold text-foreground">{formatMoney(netValue)}</span>
      </p>
    </div>
  );
}
