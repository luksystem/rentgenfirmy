"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ContractRowCompact } from "@/components/contracts/contract-row-compact";
import { createFixedPriceRow } from "@/lib/service/fixed-price";
import { calculateTableGrossTotal, calculateTableNetTotal } from "@/lib/contracts/totals";
import type { ContractTableGroup, ContractTableSection } from "@/lib/contracts/types";
import type { ServiceFixedPriceRow } from "@/lib/service/types";
import { cn, formatMoney } from "@/lib/utils";

const GROUP_OPTIONS: { value: ContractTableGroup; label: string; hint: string }[] = [
  { value: "main", label: "Główna umowa", hint: "Zawsze wliczana do sumy umowy." },
  { value: "option", label: "Opcja dodatkowa", hint: "Klient zaznacza ją przy podpisywaniu — dopiero wtedy wlicza się do sumy." },
];

export function ContractTableSectionCard({
  section,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  disabled,
}: {
  section: ContractTableSection;
  index: number;
  onChange: (next: ContractTableSection) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disabled?: boolean;
}) {
  const netTotal = calculateTableNetTotal(section);
  const grossTotal = calculateTableGrossTotal(section);

  function updateRow(rowIndex: number, next: ServiceFixedPriceRow) {
    onChange({ ...section, rows: section.rows.map((row, i) => (i === rowIndex ? next : row)) });
  }

  function removeRow(rowIndex: number) {
    onChange({ ...section, rows: section.rows.filter((_, i) => i !== rowIndex) });
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-border/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Tabela {index + 1}</p>
        <div className="flex items-center gap-1">
          {onMoveUp ? (
            <Button type="button" variant="ghost" size="sm" onClick={onMoveUp} disabled={disabled}>
              ↑
            </Button>
          ) : null}
          {onMoveDown ? (
            <Button type="button" variant="ghost" size="sm" onClick={onMoveDown} disabled={disabled}>
              ↓
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
            Usuń tabelę
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {GROUP_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange({
                ...section,
                group: option.value,
                selected: option.value === "main" ? true : section.selected,
              })
            }
            className={cn(
              "rounded-xl border p-3 text-left text-xs transition",
              section.group === option.value
                ? "border-accent/60 bg-accent/10 text-foreground"
                : "border-border/80 bg-surface-muted/20 text-muted hover:text-foreground",
            )}
          >
            <p className="text-sm font-semibold">{option.label}</p>
            <p className="mt-1 text-muted">{option.hint}</p>
          </button>
        ))}
      </div>

      <Field label="Tytuł tabeli">
        <Input
          value={section.title}
          disabled={disabled}
          onChange={(event) => onChange({ ...section, title: event.target.value })}
          placeholder="Np. Instalacja Smart Home — zakres podstawowy"
        />
      </Field>
      <Field label="Opis tabeli">
        <Textarea
          value={section.description}
          disabled={disabled}
          onChange={(event) => onChange({ ...section, description: event.target.value })}
          rows={2}
        />
      </Field>

      <div className="grid gap-1.5">
        {section.rows.length > 0 ? (
          <div className="hidden grid-cols-[1fr_5rem_4.5rem_6rem_4.5rem_7rem_auto_auto] gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid">
            <span>Nazwa</span>
            <span>Ilość</span>
            <span>J.m.</span>
            <span>Cena netto</span>
            <span>VAT</span>
            <span className="text-right">Wartość netto</span>
            <span />
            <span />
          </div>
        ) : null}
        {section.rows.map((row, rowIndex) => (
          <ContractRowCompact
            key={row.id}
            row={row}
            disabled={disabled}
            onChange={(next) => updateRow(rowIndex, next)}
            onRemove={() => removeRow(rowIndex)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => onChange({ ...section, rows: [...section.rows, createFixedPriceRow()] })}
      >
        Dodaj pozycję
      </Button>

      <p className="text-sm text-muted">
        Suma tabeli netto: <span className="font-semibold text-foreground">{formatMoney(netTotal)}</span>
        {" · "}
        brutto: <span className="font-semibold text-foreground">{formatMoney(grossTotal)}</span>
      </p>
    </div>
  );
}
