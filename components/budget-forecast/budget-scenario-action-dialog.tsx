"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  createBudgetScenarioAction,
  deleteBudgetScenarioAction,
  updateBudgetScenarioAction,
} from "@/lib/supabase/budget-scenario-action-repository";
import {
  BUDGET_COST_CADENCE_LABELS,
  BUDGET_COST_CADENCES,
  BUDGET_SCENARIO_EFFECT_TYPE_LABELS,
  BUDGET_SCENARIO_EFFECT_TYPES,
  currentMonthKey,
  type BudgetCostCadence,
  type BudgetScenarioAction,
  type BudgetScenarioEffectType,
} from "@/lib/budget-forecast/types";

type Direction = "increase" | "decrease";

type DraftState = {
  name: string;
  effectType: BudgetScenarioEffectType;
  direction: Direction;
  amount: string;
  cadence: BudgetCostCadence;
  intervalMonths: string;
  month: string;
  startMonth: string;
  endMonth: string;
  notes: string;
};

function emptyDraft(defaultMonth?: string, defaultEffectType?: BudgetScenarioEffectType): DraftState {
  const month = defaultMonth ?? currentMonthKey().slice(0, 7);
  return {
    name: "",
    effectType: defaultEffectType ?? "cost",
    direction: "decrease",
    amount: "",
    cadence: "monthly",
    intervalMonths: "3",
    month,
    startMonth: month,
    endMonth: "",
    notes: "",
  };
}

function draftFromAction(action: BudgetScenarioAction): DraftState {
  return {
    name: action.name,
    effectType: action.effectType,
    direction: action.amount < 0 ? "decrease" : "increase",
    amount: String(Math.abs(action.amount)),
    cadence: action.cadence,
    intervalMonths: action.intervalMonths ? String(action.intervalMonths) : "3",
    month: action.month ? action.month.slice(0, 7) : currentMonthKey().slice(0, 7),
    startMonth: action.startMonth.slice(0, 7),
    endMonth: action.endMonth ? action.endMonth.slice(0, 7) : "",
    notes: action.notes,
  };
}

/** Współdzielony dialog dodawania/edycji akcji symulacyjnej — panel akcji, Prognoza, Timesheet. */
export function BudgetScenarioActionDialog({
  open,
  onOpenChange,
  action,
  defaultMonth,
  defaultEffectType,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = tworzenie nowej akcji, obiekt = edycja istniejącej. */
  action: BudgetScenarioAction | null;
  defaultMonth?: string;
  defaultEffectType?: BudgetScenarioEffectType;
  onSaved: (action: BudgetScenarioAction) => void;
  onDeleted?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<DraftState>(() =>
    action ? draftFromAction(action) : emptyDraft(defaultMonth, defaultEffectType),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(action ? draftFromAction(action) : emptyDraft(defaultMonth, defaultEffectType));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, action]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const magnitude = Math.abs(Number(draft.amount) || 0);
      const amount = draft.direction === "decrease" ? -magnitude : magnitude;
      const input = {
        name: draft.name.trim(),
        effectType: draft.effectType,
        amount,
        cadence: draft.cadence,
        intervalMonths: draft.cadence === "every_n_months" ? Number(draft.intervalMonths) || 1 : null,
        month: draft.cadence === "one_off" ? `${draft.month}-01` : null,
        startMonth: draft.cadence === "one_off" ? currentMonthKey() : `${draft.startMonth}-01`,
        endMonth: draft.endMonth ? `${draft.endMonth}-01` : null,
        isEnabled: true,
        notes: draft.notes.trim(),
      };

      const saved = action
        ? await updateBudgetScenarioAction(action.id, input)
        : await createBudgetScenarioAction(input);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać akcji.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!action) return;
    setSaving(true);
    setError(null);
    try {
      await deleteBudgetScenarioAction(action.id);
      onDeleted?.(action.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć akcji.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action ? "Edytuj akcję" : "Nowa akcja symulacyjna"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {error ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <Field label="Nazwa">
            <Input
              placeholder="np. Zwolnienie Jana Kowalskiego"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Rodzaj wpływu">
              <Select
                value={draft.effectType}
                onChange={(e) => setDraft({ ...draft, effectType: e.target.value as BudgetScenarioEffectType })}
              >
                {BUDGET_SCENARIO_EFFECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {BUDGET_SCENARIO_EFFECT_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kierunek">
              <Select
                value={draft.direction}
                onChange={(e) => setDraft({ ...draft, direction: e.target.value as Direction })}
              >
                <option value="decrease">Zmniejszenie</option>
                <option value="increase">Zwiększenie</option>
              </Select>
            </Field>
            <Field label="Kwota netto (zł)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Cykliczność">
            <Select
              value={draft.cadence}
              onChange={(e) => setDraft({ ...draft, cadence: e.target.value as BudgetCostCadence })}
            >
              {BUDGET_COST_CADENCES.map((cadence) => (
                <option key={cadence} value={cadence}>
                  {BUDGET_COST_CADENCE_LABELS[cadence]}
                </option>
              ))}
            </Select>
          </Field>

          {draft.cadence === "one_off" ? (
            <Field label="Miesiąc wystąpienia">
              <Input type="month" value={draft.month} onChange={(e) => setDraft({ ...draft, month: e.target.value })} />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Od miesiąca">
                <Input
                  type="month"
                  value={draft.startMonth}
                  onChange={(e) => setDraft({ ...draft, startMonth: e.target.value })}
                />
              </Field>
              <Field label="Do miesiąca (opcjonalnie)">
                <Input
                  type="month"
                  value={draft.endMonth}
                  onChange={(e) => setDraft({ ...draft, endMonth: e.target.value })}
                />
              </Field>
            </div>
          )}

          {draft.cadence === "every_n_months" ? (
            <Field label="Co ile miesięcy">
              <Input
                type="number"
                min={1}
                value={draft.intervalMonths}
                onChange={(e) => setDraft({ ...draft, intervalMonths: e.target.value })}
              />
            </Field>
          ) : null}

          <Field label="Notatki (opcjonalnie)">
            <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>
        </div>

        <DialogFooter className="sm:justify-between">
          {action ? (
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={saving}>
              <Trash2 className="h-4 w-4" />
              Usuń
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving || !draft.name.trim()}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
