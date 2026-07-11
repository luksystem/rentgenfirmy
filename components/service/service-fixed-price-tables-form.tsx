"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ServiceFixedPriceTableRow } from "@/components/service/service-fixed-price-table";
import {
  calculateFixedPriceTableBreakdown,
  createFixedPriceRow,
  createFixedPriceTable,
} from "@/lib/service/fixed-price";
import type { ServiceFixedPriceTable, ServiceFixedPriceRow } from "@/lib/service/types";
import { formatMoney } from "@/lib/utils";
import type { VatRate } from "@/lib/service/types";

function FixedPriceTableCard({
  table,
  index,
  defaultVat,
  onChange,
  onRemove,
  disabled,
}: {
  table: ServiceFixedPriceTable;
  index: number;
  defaultVat: VatRate;
  onChange: (table: ServiceFixedPriceTable) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const breakdown = calculateFixedPriceTableBreakdown(table, defaultVat);

  function updateRow(rowIndex: number, next: ServiceFixedPriceRow) {
    onChange({
      ...table,
      rows: table.rows.map((row, itemIndex) => (itemIndex === rowIndex ? next : row)),
    });
  }

  function removeRow(rowIndex: number) {
    onChange({
      ...table,
      rows: table.rows.filter((_, itemIndex) => itemIndex !== rowIndex),
    });
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-border/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-base font-semibold text-foreground">Tabela {index + 1}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
          Usuń tabelę
        </Button>
      </div>

      <Field label="Tytuł tabeli">
        <Input
          value={table.title}
          disabled={disabled}
          onChange={(event) => onChange({ ...table, title: event.target.value })}
          placeholder="Np. Roboty montażowe"
        />
      </Field>
      <Field label="Opis tabeli">
        <Textarea
          value={table.description}
          disabled={disabled}
          onChange={(event) => onChange({ ...table, description: event.target.value })}
          rows={2}
        />
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={table.showProductDescriptions}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...table, showProductDescriptions: event.target.checked })
          }
          className="mt-0.5 h-4 w-4 rounded border-border"
        />
        <span className="text-muted">Pokaż opisy wszystkich produktów w tej tabeli</span>
      </label>

      <div className="grid gap-3">
        {table.rows.map((row, rowIndex) => (
          <ServiceFixedPriceTableRow
            key={row.id}
            row={row}
            index={rowIndex}
            showProductDescriptions={table.showProductDescriptions}
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
        onClick={() => onChange({ ...table, rows: [...table.rows, createFixedPriceRow()] })}
      >
        Dodaj pozycję
      </Button>

      <p className="text-sm text-muted">
        Suma tabeli netto:{" "}
        <span className="font-semibold text-foreground">{formatMoney(breakdown.netTotal)}</span>
        {" · "}
        brutto:{" "}
        <span className="font-semibold text-foreground">{formatMoney(breakdown.grossTotal)}</span>
      </p>
    </div>
  );
}

export function ServiceFixedPriceTablesForm({
  tables,
  defaultVat,
  onChange,
  disabled = false,
}: {
  tables: ServiceFixedPriceTable[];
  defaultVat: VatRate;
  onChange: (tables: ServiceFixedPriceTable[]) => void;
  disabled?: boolean;
}) {
  function updateTable(tableIndex: number, next: ServiceFixedPriceTable) {
    onChange(tables.map((table, index) => (index === tableIndex ? next : table)));
  }

  function removeTable(tableIndex: number) {
    onChange(tables.filter((_, index) => index !== tableIndex));
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Tabele fixed price</h3>
        <p className="mt-1 text-sm text-muted">
          Oferta ryczałtowa — klient zobaczy tabele pozycji zamiast rozliczenia godzinowego.
        </p>
      </div>

      {tables.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted">
          Dodaj tabelę z pozycjami fixed price.
        </p>
      ) : (
        tables.map((table, index) => (
          <FixedPriceTableCard
            key={table.id}
            table={table}
            index={index}
            defaultVat={defaultVat}
            disabled={disabled}
            onChange={(next) => updateTable(index, next)}
            onRemove={() => removeTable(index)}
          />
        ))
      )}

      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => onChange([...tables, createFixedPriceTable()])}
      >
        Dodaj tabelę
      </Button>
    </div>
  );
}
