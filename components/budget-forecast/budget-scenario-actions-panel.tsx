"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
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
import {
  createBudgetScenarioAction,
  deleteBudgetScenarioAction,
  updateBudgetScenarioAction,
} from "@/lib/supabase/budget-scenario-action-repository";
import { cn, formatMoney } from "@/lib/utils";

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

function emptyDraft(): DraftState {
  return {
    name: "",
    effectType: "cost",
    direction: "decrease",
    amount: "",
    cadence: "monthly",
    intervalMonths: "3",
    month: currentMonthKey().slice(0, 7),
    startMonth: currentMonthKey().slice(0, 7),
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

function describeSchedule(action: BudgetScenarioAction) {
  if (action.cadence === "one_off") {
    return `jednorazowo w ${action.month?.slice(0, 7) ?? "?"}`;
  }
  const from = `od ${action.startMonth.slice(0, 7)}`;
  const to = action.endMonth ? ` do ${action.endMonth.slice(0, 7)}` : "";
  if (action.cadence === "every_n_months") {
    return `co ${action.intervalMonths} mies. ${from}${to}`;
  }
  return `co miesiąc ${from}${to}`;
}

export function BudgetScenarioActionsPanel({
  actions,
  onActionsChange,
  canManage,
}: {
  actions: BudgetScenarioAction[];
  onActionsChange: (next: BudgetScenarioAction[]) => void;
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [saving, setSaving] = useState(false);

  function openCreateDialog() {
    setEditingId(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  }

  function openEditDialog(action: BudgetScenarioAction) {
    setEditingId(action.id);
    setDraft(draftFromAction(action));
    setDialogOpen(true);
  }

  async function handleToggle(action: BudgetScenarioAction) {
    setBusyId(action.id);
    setError(null);
    // Optymistyczna aktualizacja — natychmiastowe przeliczenie prognozy bez czekania na zapis.
    onActionsChange(
      actions.map((item) => (item.id === action.id ? { ...item, isEnabled: !item.isEnabled } : item)),
    );
    try {
      await updateBudgetScenarioAction(action.id, { isEnabled: !action.isEnabled });
    } catch (err) {
      onActionsChange(actions);
      setError(err instanceof Error ? err.message : "Nie udało się przełączyć akcji.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveDraft() {
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

      if (editingId) {
        const updated = await updateBudgetScenarioAction(editingId, input);
        onActionsChange(actions.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await createBudgetScenarioAction(input);
        onActionsChange([created, ...actions]);
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać akcji.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(action: BudgetScenarioAction) {
    setBusyId(action.id);
    setError(null);
    try {
      await deleteBudgetScenarioAction(action.id);
      onActionsChange(actions.filter((item) => item.id !== action.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć akcji.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Akcje symulacyjne</CardTitle>
        {canManage ? (
          <Button type="button" size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Dodaj akcję
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-muted">
          Przełączalne „co jeśli” — np. zwolnienie pracownika, nowa umowa, redukcja kosztów. Włącz/wyłącz,
          żeby zobaczyć wpływ na wykres i tabelę na żywo, bez zapisywania osobnych scenariuszy.
        </p>

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {actions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">Brak zdefiniowanych akcji symulacyjnych.</p>
        ) : (
          <div className="grid gap-2">
            {actions.map((action) => (
              <div
                key={action.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 px-4 py-3",
                  !action.isEnabled && "opacity-50",
                )}
              >
                <label className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 rounded border-border accent-blue-500 disabled:opacity-50"
                    checked={action.isEnabled}
                    disabled={!canManage || busyId === action.id}
                    onChange={() => void handleToggle(action)}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">{action.name}</span>
                    <span className="block text-xs text-muted">{describeSchedule(action)}</span>
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <Badge tone={action.effectType === "cost" ? "waiting" : "active"}>
                    {BUDGET_SCENARIO_EFFECT_TYPE_LABELS[action.effectType]} {action.amount >= 0 ? "+" : ""}
                    {formatMoney(action.amount)}
                  </Badge>
                  {canManage ? (
                    <>
                      <Button type="button" variant="secondary" size="sm" onClick={() => openEditDialog(action)}>
                        Edytuj
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busyId === action.id}
                        onClick={() => void handleDelete(action)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj akcję" : "Nowa akcja symulacyjna"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
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
              <Field label="Kwota (zł)">
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
                <Input
                  type="month"
                  value={draft.month}
                  onChange={(e) => setDraft({ ...draft, month: e.target.value })}
                />
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

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={() => void handleSaveDraft()} disabled={saving || !draft.name.trim()}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
