"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { validateFormula } from "@/lib/calculator/formula";
import type { CalculatorRule } from "@/lib/calculator/rules-types";
import { formatMoney } from "@/lib/utils";
import { BomLinesEditor, QuantitySourceEditor, RulePriceEditor, TiersEditor } from "@/components/calculator/rule-value-editors";

const KIND_LABELS: Record<CalculatorRule["kind"], string> = {
  flat: "Stała kwota",
  tiered: "Progi",
  quantity: "Ilość × cena",
  bom: "Lista pozycji (BOM)",
  formula: "Formuła",
};

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-foreground/90">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 rounded border-border"
      />
      {label}
    </label>
  );
}

export function RuleEditor({
  rule,
  onChange,
  onDelete,
  previewValue,
  knownVariables,
}: {
  rule: CalculatorRule;
  onChange: (next: CalculatorRule) => void;
  onDelete: () => void;
  previewValue: number | undefined;
  knownVariables: Set<string>;
}) {
  const [open, setOpen] = useState(false);

  function patch(fields: Partial<CalculatorRule>) {
    onChange({ ...rule, ...fields } as CalculatorRule);
  }

  const formulaError =
    rule.kind === "formula" && rule.expression.trim() !== "" ? validateFormula(rule.expression, knownVariables) : null;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{rule.label}</span>
        <span className="hidden shrink-0 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[11px] text-muted sm:inline">
          {KIND_LABELS[rule.kind]}
        </span>
        {previewValue !== undefined ? (
          <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-accent">
            {formatMoney(previewValue)}
          </span>
        ) : null}
        {formulaError ? (
          <span className="shrink-0 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-300">
            błąd formuły
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="grid gap-4 border-t border-border/60 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nazwa pozycji">
              <Input value={rule.label} onChange={(event) => patch({ label: event.target.value })} />
            </Field>
            <Field label="Klucz (identyfikator, techniczny)">
              <Input value={rule.key} onChange={(event) => patch({ key: event.target.value })} className="font-mono text-xs" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bramka — pole włącz/wyłącz (puste = zawsze aktywna)">
              <Input
                value={rule.gate ?? ""}
                onChange={(event) => patch({ gate: event.target.value.trim() === "" ? null : event.target.value })}
                placeholder="np. addon_stacjaPogodowa"
                className="font-mono text-xs"
              />
            </Field>
            <Field label="Mnożniki końcowe (po przecinku, np. trudnyKlientWspolczynnik)">
              <Input
                value={rule.postMultipliers.join(", ")}
                onChange={(event) =>
                  patch({
                    postMultipliers: event.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="np. trudnyKlientWspolczynnik, wspolczynnikOutdoor"
                className="font-mono text-xs"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-surface-muted/30 p-3">
            <Toggle
              label="Wlicza się do sumy oferty (odznacz dla pozycji pomocniczej)"
              checked={rule.contributesToTotal}
              onChange={(v) => patch({ contributesToTotal: v })}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Grupa zaokrąglenia (puste = liczona osobno)</span>
              <Input
                value={rule.roundingGroup ?? ""}
                onChange={(event) => patch({ roundingGroup: event.target.value.trim() === "" ? null : event.target.value })}
                placeholder="np. bazaZasilania"
                className="w-40 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-foreground/90">Kształt reguły</p>
            <Select
              value={rule.kind}
              onChange={(event) => {
                const kind = event.target.value as CalculatorRule["kind"];
                if (kind === rule.kind) return;
                const base = { ...rule } as Record<string, unknown>;
                delete base.amount;
                delete base.input;
                delete base.tiers;
                delete base.quantity;
                delete base.unitPrice;
                delete base.lines;
                delete base.labor;
                delete base.expression;
                if (kind === "flat") onChange({ ...(base as CalculatorRule), kind, amount: 0 } as CalculatorRule);
                else if (kind === "tiered")
                  onChange({ ...(base as CalculatorRule), kind, input: { type: "fixed", value: 0 }, tiers: [] } as CalculatorRule);
                else if (kind === "quantity")
                  onChange({ ...(base as CalculatorRule), kind, quantity: { type: "fixed", value: 1 }, unitPrice: 0 } as CalculatorRule);
                else if (kind === "bom") onChange({ ...(base as CalculatorRule), kind, lines: [], labor: null } as CalculatorRule);
                else onChange({ ...(base as CalculatorRule), kind, expression: "" } as CalculatorRule);
              }}
              className="w-56"
            >
              <option value="flat">Stała kwota</option>
              <option value="tiered">Progi</option>
              <option value="quantity">Ilość × cena</option>
              <option value="bom">Lista pozycji (BOM)</option>
              <option value="formula">Formuła</option>
            </Select>
          </div>

          {rule.kind === "flat" ? (
            <Field label="Kwota" className="max-w-xs">
              <NumericInput value={rule.amount} onChange={(v) => patch({ amount: v })} />
            </Field>
          ) : rule.kind === "tiered" ? (
            <div className="grid gap-3">
              <div>
                <p className="mb-1 text-xs font-medium text-foreground/90">Wartość porównywana z progami</p>
                <QuantitySourceEditor value={rule.input} onChange={(v) => patch({ input: v })} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-foreground/90">Progi (sprawdzane po kolei, pierwszy pasujący wygrywa)</p>
                <TiersEditor tiers={rule.tiers} onChange={(v) => patch({ tiers: v })} />
              </div>
            </div>
          ) : rule.kind === "quantity" ? (
            <div className="grid gap-3">
              <div>
                <p className="mb-1 text-xs font-medium text-foreground/90">Ilość</p>
                <QuantitySourceEditor value={rule.quantity} onChange={(v) => patch({ quantity: v })} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-foreground/90">Cena jednostkowa</p>
                <RulePriceEditor value={rule.unitPrice} onChange={(v) => patch({ unitPrice: v })} />
              </div>
            </div>
          ) : rule.kind === "bom" ? (
            <div className="grid gap-3">
              <p className="text-xs font-medium text-foreground/90">Pozycje</p>
              <BomLinesEditor lines={rule.lines} onChange={(v) => patch({ lines: v })} />
              <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                <Toggle
                  label="Dolicz robociznę (godziny × stawka)"
                  checked={rule.labor !== null}
                  onChange={(v) => patch({ labor: v ? { hours: { type: "fixed", value: 0 }, ratePerHour: 120 } : null })}
                />
                {rule.labor ? (
                  <div className="mt-2 grid gap-2">
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">Godziny</p>
                      <QuantitySourceEditor
                        value={rule.labor.hours}
                        onChange={(v) => patch({ labor: { ...rule.labor!, hours: v } })}
                      />
                    </div>
                    <Field label="Stawka za godzinę" className="max-w-xs">
                      <NumericInput
                        value={rule.labor.ratePerHour}
                        onChange={(v) => patch({ labor: { ...rule.labor!, ratePerHour: v } })}
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <Field label="Formuła" error={formulaError ?? undefined} invalid={Boolean(formulaError)}>
              <Textarea
                value={rule.expression}
                onChange={(event) => patch({ expression: event.target.value })}
                className="font-mono text-xs"
                rows={3}
              />
            </Field>
          )}

          <Field label="Notatka (widoczna tylko w edytorze)">
            <Textarea value={rule.notes ?? ""} onChange={(event) => patch({ notes: event.target.value || null })} rows={2} />
          </Field>

          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="text-rose-400">
              Usuń regułę
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
