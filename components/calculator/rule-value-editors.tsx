"use client";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  emptyBomLine,
  isConditionalPrice,
  isFormulaPrice,
  type BomLine,
  type QuantitySource,
  type RuleTier,
  type RulePrice,
} from "@/lib/calculator/rules-types";
import { cn } from "@/lib/utils";

/** Wspólny mono-styl dla pól z nazwami zmiennych/formuł — odróżnia je wizualnie od zwykłych liczb. */
const monoInputClassName = "font-mono text-xs";

export function QuantitySourceEditor({
  value,
  onChange,
}: {
  value: QuantitySource;
  onChange: (next: QuantitySource) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.type}
        onChange={(event) => {
          const type = event.target.value as QuantitySource["type"];
          if (type === "fixed") onChange({ type: "fixed", value: 0 });
          else if (type === "field") onChange({ type: "field", field: "" });
          else onChange({ type: "formula", expression: "" });
        }}
        className="w-40 shrink-0"
      >
        <option value="fixed">Stała liczba</option>
        <option value="field">Pole ankiety</option>
        <option value="formula">Formuła</option>
      </Select>
      {value.type === "fixed" ? (
        <NumericInput value={value.value} onChange={(v) => onChange({ type: "fixed", value: v })} className="w-28" />
      ) : value.type === "field" ? (
        <Input
          value={value.field}
          onChange={(event) => onChange({ type: "field", field: event.target.value })}
          placeholder="np. liczbaOkienOtwieranych"
          className={cn(monoInputClassName, "flex-1")}
        />
      ) : (
        <Input
          value={value.expression}
          onChange={(event) => onChange({ type: "formula", expression: event.target.value })}
          placeholder="np. ROUNDUP(iloscOswSciemniane/4;0)"
          className={cn(monoInputClassName, "flex-1")}
        />
      )}
    </div>
  );
}

function rulePriceKind(price: RulePrice): "number" | "conditional" | "formula" {
  if (isConditionalPrice(price)) return "conditional";
  if (isFormulaPrice(price)) return "formula";
  return "number";
}

export function RulePriceEditor({ value, onChange }: { value: RulePrice; onChange: (next: RulePrice) => void }) {
  const kind = rulePriceKind(value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={kind}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "number") onChange(0);
          else if (next === "conditional") onChange({ ifField: "", whenTrue: 0, whenFalse: 0 });
          else onChange({ formula: "" });
        }}
        className="w-40 shrink-0"
      >
        <option value="number">Cena stała</option>
        <option value="conditional">Cena warunkowa</option>
        <option value="formula">Cena z formuły</option>
      </Select>
      {kind === "number" ? (
        <NumericInput value={value as number} onChange={onChange} decimals className="w-28" />
      ) : kind === "conditional" ? (
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <Input
            value={(value as { ifField: string }).ifField}
            onChange={(event) => onChange({ ...(value as { whenTrue: number; whenFalse: number }), ifField: event.target.value })}
            placeholder="pole warunku"
            className={cn(monoInputClassName, "w-40")}
          />
          <span className="text-xs text-muted">gdy TAK</span>
          <NumericInput
            value={(value as { whenTrue: number }).whenTrue}
            onChange={(v) => onChange({ ...(value as { ifField: string; whenFalse: number }), whenTrue: v })}
            className="w-24"
          />
          <span className="text-xs text-muted">gdy NIE</span>
          <NumericInput
            value={(value as { whenFalse: number }).whenFalse}
            onChange={(v) => onChange({ ...(value as { ifField: string; whenTrue: number }), whenFalse: v })}
            className="w-24"
          />
        </div>
      ) : (
        <Input
          value={(value as { formula: string }).formula}
          onChange={(event) => onChange({ formula: event.target.value })}
          placeholder="np. stawkaInteligentny"
          className={cn(monoInputClassName, "flex-1")}
        />
      )}
    </div>
  );
}

export function TiersEditor({ tiers, onChange }: { tiers: RuleTier[]; onChange: (next: RuleTier[]) => void }) {
  function update(index: number, patch: Partial<RuleTier>) {
    onChange(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }
  function remove(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }
  return (
    <div className="grid gap-2">
      {tiers.map((tier, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-surface-muted/40 p-2">
          <span className="text-xs text-muted">do wartości ≤</span>
          <NumericInput
            value={tier.upTo ?? 0}
            onChange={(v) => update(index, { upTo: v })}
            disabled={tier.upTo === null}
            className="w-24"
          />
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={tier.upTo === null}
              onChange={(event) => update(index, { upTo: event.target.checked ? null : 0 })}
              className="h-3.5 w-3.5"
            />
            i więcej (ostatni próg)
          </label>
          <span className="text-xs text-muted">→ kwota</span>
          <NumericInput value={tier.amount} onChange={(v) => update(index, { amount: v })} className="w-28" />
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="ml-auto text-rose-400">
            Usuń
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...tiers, { upTo: 0, amount: 0 }])}
        className="justify-self-start"
      >
        Dodaj próg
      </Button>
    </div>
  );
}

export function BomLinesEditor({ lines, onChange }: { lines: BomLine[]; onChange: (next: BomLine[]) => void }) {
  function update(index: number, patch: Partial<BomLine>) {
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function remove(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }
  return (
    <div className="grid gap-2">
      {lines.map((line, index) => (
        <div key={line.id} className="grid gap-2 rounded-lg border border-border/60 bg-surface-muted/40 p-3">
          <div className="flex items-center gap-2">
            <Input
              value={line.label}
              onChange={(event) => update(index, { label: event.target.value })}
              placeholder="Nazwa pozycji"
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-rose-400">
              Usuń
            </Button>
          </div>
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">Ilość</p>
            <QuantitySourceEditor value={line.quantity} onChange={(v) => update(index, { quantity: v })} />
          </div>
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">Cena jednostkowa</p>
            <RulePriceEditor value={line.unitPrice} onChange={(v) => update(index, { unitPrice: v })} />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...lines, emptyBomLine(`bl-${Date.now()}-${lines.length}`)])}
        className="justify-self-start"
      >
        Dodaj pozycję
      </Button>
    </div>
  );
}
