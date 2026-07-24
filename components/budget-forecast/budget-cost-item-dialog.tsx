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
  createBudgetCostItem,
  deleteBudgetCostItem,
  updateBudgetCostItem,
} from "@/lib/supabase/budget-cost-item-repository";
import {
  BUDGET_COST_CADENCE_LABELS,
  BUDGET_COST_CADENCES,
  BUDGET_COST_CATEGORIES,
  BUDGET_COST_CATEGORY_LABELS,
  currentMonthKey,
  type BudgetCostCadence,
  type BudgetCostCategory,
  type BudgetCostItem,
} from "@/lib/budget-forecast/types";

type DraftState = {
  name: string;
  category: BudgetCostCategory;
  amount: string;
  cadence: BudgetCostCadence;
  intervalMonths: string;
  month: string;
  startMonth: string;
  endMonth: string;
  notes: string;
};

function emptyDraft(defaultMonth?: string): DraftState {
  const month = defaultMonth ?? currentMonthKey().slice(0, 7);
  return {
    name: "",
    category: "inne",
    amount: "",
    cadence: "monthly",
    intervalMonths: "3",
    month,
    startMonth: month,
    endMonth: "",
    notes: "",
  };
}

function draftFromItem(item: BudgetCostItem): DraftState {
  return {
    name: item.name,
    category: item.category,
    amount: String(item.amount),
    cadence: item.cadence,
    intervalMonths: item.intervalMonths ? String(item.intervalMonths) : "3",
    month: item.month ? item.month.slice(0, 7) : currentMonthKey().slice(0, 7),
    startMonth: item.startMonth.slice(0, 7),
    endMonth: item.endMonth ? item.endMonth.slice(0, 7) : "",
    notes: item.notes,
  };
}

/** Współdzielony dialog dodawania/edycji kosztu stałego — używany w liście kosztów, na Prognozie i w Timesheet. */
export function BudgetCostItemDialog({
  open,
  onOpenChange,
  item,
  defaultMonth,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = tworzenie nowego kosztu, obiekt = edycja istniejącego. */
  item: BudgetCostItem | null;
  /** Miesiąc do wstępnego uzupełnienia przy tworzeniu (np. klik w konkretną kolumnę Timesheetu). */
  defaultMonth?: string;
  onSaved: (item: BudgetCostItem) => void;
  onDeleted?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<DraftState>(() => (item ? draftFromItem(item) : emptyDraft(defaultMonth)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(item ? draftFromItem(item) : emptyDraft(defaultMonth));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const input = {
        name: draft.name.trim(),
        category: draft.category,
        amount: Number(draft.amount) || 0,
        cadence: draft.cadence,
        intervalMonths: draft.cadence === "every_n_months" ? Number(draft.intervalMonths) || 1 : null,
        month: draft.cadence === "one_off" ? `${draft.month}-01` : null,
        startMonth: draft.cadence === "one_off" ? currentMonthKey() : `${draft.startMonth}-01`,
        endMonth: draft.endMonth ? `${draft.endMonth}-01` : null,
        isActive: true,
        notes: draft.notes.trim(),
      };

      const saved = item ? await updateBudgetCostItem(item.id, input) : await createBudgetCostItem(input);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać kosztu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      await deleteBudgetCostItem(item.id);
      onDeleted?.(item.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć kosztu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edytuj koszt" : "Nowy koszt stały"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {error ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <Field label="Nazwa">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategoria">
              <Select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as BudgetCostCategory })}
              >
                {BUDGET_COST_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {BUDGET_COST_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kwota netto (zł)">
              <Input
                type="number"
                step="0.01"
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
          {item ? (
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
