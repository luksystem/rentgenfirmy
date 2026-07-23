"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  computeMaterialItemNetAmount,
  createMaterialItem,
} from "@/lib/service/material-items";
import { VAT_RATES, type ServiceMaterialItem, type VatRate } from "@/lib/service/types";
import { cn, formatMoney } from "@/lib/utils";

function materialItemAmounts(item: ServiceMaterialItem) {
  const netAmount = computeMaterialItemNetAmount(item);
  const vatAmount = Math.round((netAmount * item.vatRate) / 100 * 100) / 100;
  const grossAmount = Math.round((netAmount + vatAmount) * 100) / 100;
  return { netAmount, vatAmount, grossAmount };
}

function withRecomputedAmount(item: ServiceMaterialItem): ServiceMaterialItem {
  return { ...item, netAmount: computeMaterialItemNetAmount(item) };
}

function MaterialItemCard({
  item,
  index,
  onChange,
  onRemove,
  disabled,
}: {
  item: ServiceMaterialItem;
  index: number;
  onChange: (item: ServiceMaterialItem) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { netAmount, vatAmount, grossAmount } = materialItemAmounts(item);

  return (
    <div className="grid gap-3 rounded-xl border border-border/80 bg-surface-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Materiał {index + 1}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
          Usuń
        </Button>
      </div>

      <Field label="Tytuł">
        <Input
          value={item.title}
          disabled={disabled}
          onChange={(event) => onChange({ ...item, title: event.target.value })}
          placeholder="Np. Moduł sterujący"
        />
      </Field>
      <Field label="Opis">
        <Textarea
          value={item.description}
          disabled={disabled}
          onChange={(event) => onChange({ ...item, description: event.target.value })}
          placeholder="Szczegóły pozycji…"
          rows={2}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Cena jednostkowa netto (PLN)">
          <NumericInput
            value={item.netUnitPrice}
            disabled={disabled}
            onChange={(value) => onChange(withRecomputedAmount({ ...item, netUnitPrice: value }))}
          />
        </Field>
        <Field label="Ilość">
          <NumericInput
            value={item.quantity}
            disabled={disabled}
            onChange={(value) => onChange(withRecomputedAmount({ ...item, quantity: value }))}
          />
        </Field>
        <Field label="Stawka VAT">
          <Select
            value={String(item.vatRate)}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...item, vatRate: Number(event.target.value) as VatRate })
            }
          >
            {VAT_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}%
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/70 p-3 text-sm">
        <input
          type="checkbox"
          checked={item.billable}
          disabled={disabled}
          onChange={(event) => onChange({ ...item, billable: event.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-border"
        />
        <span>
          <span className="font-medium text-foreground">Uwzględnij w rozliczeniu</span>
        </span>
      </label>

      <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted">
        Netto: <span className="font-medium text-foreground">{formatMoney(netAmount)}</span>
        <span className="mx-2 text-border">·</span>
        VAT: <span className="font-medium text-foreground">{formatMoney(vatAmount)}</span>
        <span className="mx-2 text-border">·</span>
        Brutto: <span className="font-semibold text-foreground">{formatMoney(grossAmount)}</span>
      </div>
    </div>
  );
}

export function ServiceMaterialItemsForm({
  items,
  onChange,
  disabled = false,
}: {
  items: ServiceMaterialItem[];
  onChange: (items: ServiceMaterialItem[]) => void;
  disabled?: boolean;
}) {
  function updateItem(index: number, next: ServiceMaterialItem) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? next : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function addItem() {
    onChange([...items, createMaterialItem()]);
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Pozycje materiałów</h3>
        <p className="mt-1 text-sm text-muted">
          Rozbij koszty sprzętu i materiałów na osobne pozycje z własną stawką VAT.
        </p>
      </div>

      {items.length === 0 ? (
        <p
          className={cn(
            "rounded-xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted",
          )}
        >
          Brak pozycji materiałów. Dodaj pozycję lub zostaw puste — wtedy używany jest jeden agregat
          „Koszt materiałów”.
        </p>
      ) : (
        items.map((item, index) => (
          <MaterialItemCard
            key={item.id}
            item={item}
            index={index}
            disabled={disabled}
            onChange={(next) => updateItem(index, next)}
            onRemove={() => removeItem(index)}
          />
        ))
      )}

      <Button type="button" variant="secondary" onClick={addItem} disabled={disabled}>
        Dodaj pozycję materiału
      </Button>
    </div>
  );
}
