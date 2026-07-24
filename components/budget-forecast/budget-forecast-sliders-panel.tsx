"use client";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BUDGET_CONFIDENCE_LEVELS,
  BUDGET_CONFIDENCE_LABELS,
  type BudgetConfidenceLevel,
} from "@/lib/budget-forecast/types";

export type BudgetForecastAssumptions = {
  openingBalance: number;
  variableCostPercent: number;
  confidenceWeights: Record<BudgetConfidenceLevel, number>;
};

export function BudgetForecastSlidersPanel({
  assumptions,
  onChange,
  canManageSettings,
  onSave,
  saving,
  dirty,
}: {
  assumptions: BudgetForecastAssumptions;
  onChange: (next: BudgetForecastAssumptions) => void;
  canManageSettings: boolean;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Założenia prognozy</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Field label="Saldo otwarcia (zł)">
          <Input
            type="number"
            step="0.01"
            value={assumptions.openingBalance}
            disabled={!canManageSettings}
            onChange={(event) =>
              onChange({ ...assumptions, openingBalance: Number(event.target.value) || 0 })
            }
          />
        </Field>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between text-sm font-medium text-foreground/90">
            <span>Koszt zmienny (% przychodu miesiąca)</span>
            <span className="tabular-nums text-muted">
              {Math.round(assumptions.variableCostPercent * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(assumptions.variableCostPercent * 100)}
            onChange={(event) =>
              onChange({ ...assumptions, variableCostPercent: Number(event.target.value) / 100 })
            }
            className="accent-blue-500"
          />
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-medium text-foreground/90">
            Wagi pewności pipeline — ile % kwoty prognozy liczyć jako spodziewany wpływ
          </p>
          {BUDGET_CONFIDENCE_LEVELS.map((level: BudgetConfidenceLevel) => (
            <div key={level} className="grid gap-1">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{BUDGET_CONFIDENCE_LABELS[level]}</span>
                <span className="tabular-nums">
                  {Math.round(assumptions.confidenceWeights[level] * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(assumptions.confidenceWeights[level] * 100)}
                onChange={(event) =>
                  onChange({
                    ...assumptions,
                    confidenceWeights: {
                      ...assumptions.confidenceWeights,
                      [level]: Number(event.target.value) / 100,
                    },
                  })
                }
                className="accent-blue-500"
              />
            </div>
          ))}
        </div>

        {canManageSettings ? (
          <Button type="button" onClick={onSave} disabled={saving || !dirty}>
            {saving ? "Zapisywanie..." : "Zapisz jako domyślne"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
