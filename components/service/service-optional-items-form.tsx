"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  createOptionalItem,
  optionalItemAmounts,
} from "@/lib/service/optional-items";
import { VAT_RATES, type ServiceOptionalItem, type VatRate } from "@/lib/service/types";
import { cn, formatMoney } from "@/lib/utils";

function OptionalItemCard({
  item,
  index,
  mode,
  onChange,
  onRemove,
}: {
  item: ServiceOptionalItem;
  index: number;
  mode: "edit" | "settlement";
  onChange: (item: ServiceOptionalItem) => void;
  onRemove: () => void;
}) {
  const { vatAmount, grossAmount } = optionalItemAmounts(item);
  const showSettlementToggle = mode === "settlement" && item.clientSelected;

  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border p-4",
        mode === "settlement" && item.clientSelected
          ? "border-accent/35 bg-accent/5"
          : "border-border/80 bg-surface-muted/20",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Pozycja opcjonalna {index + 1}
          {mode === "settlement" && item.clientSelected ? (
            <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
              Wybrane przez klienta
            </span>
          ) : null}
        </p>
        {mode === "edit" ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Usuń
          </Button>
        ) : null}
      </div>

      {mode === "edit" ? (
        <>
          <Field label="Tytuł">
            <Input
              value={item.title}
              onChange={(event) => onChange({ ...item, title: event.target.value })}
              placeholder="Np. Dodatkowa konfiguracja stref"
            />
          </Field>
          <Field label="Opis">
            <Textarea
              value={item.description}
              onChange={(event) => onChange({ ...item, description: event.target.value })}
              placeholder="Krótki opis zakresu prac…"
              rows={3}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kwota netto (PLN)">
              <NumericInput
                value={item.netAmount}
                onChange={(value) => onChange({ ...item, netAmount: value })}
              />
            </Field>
            <Field label="Stawka VAT">
              <Select
                value={String(item.vatRate)}
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
        </>
      ) : (
        <div className="grid gap-2 text-sm">
          <p className="font-medium text-foreground">{item.title || "Bez tytułu"}</p>
          {item.description ? <p className="text-muted whitespace-pre-wrap">{item.description}</p> : null}
          <p className="text-muted">
            netto {formatMoney(item.netAmount)} · VAT {item.vatRate}% · brutto{" "}
            <span className="font-semibold text-foreground">{formatMoney(grossAmount)}</span>
          </p>
        </div>
      )}

      {mode === "edit" ? (
        <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted">
          VAT: <span className="font-medium text-foreground">{formatMoney(vatAmount)}</span>
          <span className="mx-2 text-border">·</span>
          Brutto: <span className="font-semibold text-foreground">{formatMoney(grossAmount)}</span>
        </div>
      ) : null}

      {showSettlementToggle ? (
        <label className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/70 p-3 text-sm">
          <input
            type="checkbox"
            checked={item.billable}
            onChange={(event) => onChange({ ...item, billable: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-border"
          />
          <span>
            <span className="font-medium text-foreground">Uwzględnij w rozliczeniu</span>
            <span className="mt-0.5 block text-xs text-muted">
              Klient wybrał tę pozycję przy akceptacji. Odznacz, jeśli prace nie zostały wykonane.
            </span>
          </span>
        </label>
      ) : null}

      {mode === "settlement" && !item.clientSelected ? (
        <p className="text-xs text-muted">Klient nie wybrał tej pozycji przy akceptacji oferty.</p>
      ) : null}
    </div>
  );
}

export function ServiceOptionalItemsForm({
  items,
  mode,
  onChange,
}: {
  items: ServiceOptionalItem[];
  mode: "edit" | "settlement";
  onChange: (items: ServiceOptionalItem[]) => void;
}) {
  function updateItem(index: number, next: ServiceOptionalItem) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? next : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function addItem() {
    onChange([...items, createOptionalItem()]);
  }

  const visibleItems =
    mode === "settlement" ? items.filter((item) => item.title.trim() || item.netAmount > 0) : items;

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Pozycje opcjonalne</h3>
        <p className="mt-1 text-sm text-muted">
          {mode === "edit"
            ? "Klient zobaczy je na publicznym linku i może zaznaczyć checkboxem przed akceptacją. Wybrane pozycje doliczają się do kwoty oferty."
            : "Pozycje wybrane przez klienta przy akceptacji. Możesz je odhaczyć w rozliczeniu, jeśli nie zostały wykonane."}
        </p>
      </div>

      {visibleItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted">
          {mode === "edit"
            ? "Brak pozycji opcjonalnych. Dodaj pozycję, jeśli chcesz zaproponować klientowi dodatkowe prace do wyboru."
            : "Brak pozycji opcjonalnych w tej ofercie."}
        </p>
      ) : (
        visibleItems.map((item, index) => (
          <OptionalItemCard
            key={item.id}
            item={item}
            index={index}
            mode={mode}
            onChange={(next) => updateItem(items.findIndex((entry) => entry.id === item.id), next)}
            onRemove={() => removeItem(items.findIndex((entry) => entry.id === item.id))}
          />
        ))
      )}

      {mode === "edit" ? (
        <Button type="button" variant="secondary" onClick={addItem}>
          Dodaj pozycję opcjonalną
        </Button>
      ) : null}
    </div>
  );
}
