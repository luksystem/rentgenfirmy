"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { ContractRowCompact } from "@/components/contracts/contract-row-compact";
import { createFixedPriceRow } from "@/lib/service/fixed-price";
import { calculateTableNetTotal } from "@/lib/contracts/totals";
import {
  CONTRACT_OPTION_CATEGORIES,
  CONTRACT_OPTION_CATEGORY_LABELS,
  type ContractOptionCategory,
  type ContractTableSection,
} from "@/lib/contracts/types";
import type { ContractModuleSettings } from "@/lib/contracts/module-settings";
import { discountPercentForCategory } from "@/lib/contracts/module-settings";
import type { ServiceFixedPriceRow } from "@/lib/service/types";
import { cn, formatMoney } from "@/lib/utils";

const CATEGORY_HINTS: Record<ContractOptionCategory, string> = {
  instalacja: "Cała tabela zaznaczana na raz przez klienta — z rabatem od jej sumy.",
  instalacje_dodatkowe: "Cała tabela zaznaczana na raz przez klienta — z rabatem od jej sumy.",
  dodatki: "Klient zaznacza każdą pozycję osobno — bez rabatu na poziomie kategorii.",
};

export function ContractTableSectionCard({
  section,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  moduleSettings,
  disabled,
}: {
  section: ContractTableSection;
  index: number;
  onChange: (next: ContractTableSection) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  moduleSettings?: ContractModuleSettings;
  disabled?: boolean;
}) {
  const netTotal = calculateTableNetTotal(section);

  function updateRow(rowIndex: number, next: ServiceFixedPriceRow) {
    onChange({ ...section, rows: section.rows.map((row, i) => (i === rowIndex ? next : row)) });
  }

  function removeRow(rowIndex: number) {
    onChange({ ...section, rows: section.rows.filter((_, i) => i !== rowIndex) });
  }

  function setMain() {
    onChange({ ...section, group: "main", category: null, categoryDiscountPercent: 0, selected: true });
  }

  function setCategory(category: ContractOptionCategory) {
    const discount = moduleSettings ? discountPercentForCategory(moduleSettings, category) : 0;
    onChange({
      ...section,
      group: "option",
      category,
      categoryDiscountPercent: category === section.category ? section.categoryDiscountPercent : discount,
      selected: false,
      selectedRowIds: [],
    });
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

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          disabled={disabled}
          onClick={setMain}
          className={cn(
            "rounded-xl border p-3 text-left text-xs transition",
            section.group === "main"
              ? "border-accent/60 bg-accent/10 text-foreground"
              : "border-border/80 bg-surface-muted/20 text-muted hover:text-foreground",
          )}
        >
          <p className="text-sm font-semibold">Główna umowa</p>
          <p className="mt-1 text-muted">Zawsze wliczana do sumy umowy.</p>
        </button>
        {CONTRACT_OPTION_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            disabled={disabled}
            onClick={() => setCategory(category)}
            className={cn(
              "rounded-xl border p-3 text-left text-xs transition",
              section.group === "option" && section.category === category
                ? "border-accent/60 bg-accent/10 text-foreground"
                : "border-border/80 bg-surface-muted/20 text-muted hover:text-foreground",
            )}
          >
            <p className="text-sm font-semibold">{CONTRACT_OPTION_CATEGORY_LABELS[category]}</p>
            <p className="mt-1 text-muted">{CATEGORY_HINTS[category]}</p>
          </button>
        ))}
      </div>

      {section.group === "option" && section.category && section.category !== "dodatki" ? (
        <Field label={`Rabat za kategorię „${CONTRACT_OPTION_CATEGORY_LABELS[section.category]}” (%)`} className="sm:max-w-xs">
          <NumericInput
            value={section.categoryDiscountPercent}
            disabled={disabled}
            onChange={(value) => onChange({ ...section, categoryDiscountPercent: Math.min(100, Math.max(0, value)) })}
          />
        </Field>
      ) : null}

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
          <div className="hidden grid-cols-[1fr_5rem_4.5rem_6rem_7rem_auto_auto] gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid">
            <span>Nazwa</span>
            <span>Ilość</span>
            <span>J.m.</span>
            <span>Cena netto</span>
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
      </p>
    </div>
  );
}
