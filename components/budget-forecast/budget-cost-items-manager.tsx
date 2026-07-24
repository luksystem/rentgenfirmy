"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { hasFullAppAccess } from "@/lib/auth/types";
import {
  createBudgetCostItem,
  deleteBudgetCostItem,
  fetchAllBudgetCostItems,
  updateBudgetCostItem,
} from "@/lib/supabase/budget-cost-item-repository";
import {
  BUDGET_COST_CADENCE_LABELS,
  BUDGET_COST_CADENCES,
  BUDGET_COST_CATEGORIES,
  BUDGET_COST_CATEGORY_LABELS,
  currentMonthKey,
  type BudgetCostItem,
  type BudgetCostCadence,
  type BudgetCostCategory,
} from "@/lib/budget-forecast/types";
import { cn, formatMoney } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

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

function emptyDraft(): DraftState {
  return {
    name: "",
    category: "inne",
    amount: "",
    cadence: "monthly",
    intervalMonths: "3",
    month: currentMonthKey().slice(0, 7),
    startMonth: currentMonthKey().slice(0, 7),
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

export function BudgetCostItemsManager() {
  const profile = useAuthStore((state) => state.profile);
  const canManage = Boolean(profile && hasFullAppAccess(profile.role));

  const [items, setItems] = useState<BudgetCostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    reload();
  }, []);

  function reload() {
    setLoading(true);
    setError(null);
    void fetchAllBudgetCostItems()
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Nie udało się wczytać kosztów."))
      .finally(() => setLoading(false));
  }

  function openCreateDialog() {
    setEditingId(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  }

  function openEditDialog(item: BudgetCostItem) {
    setEditingId(item.id);
    setDraft(draftFromItem(item));
    setDialogOpen(true);
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
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

      if (editingId) {
        const updated = await updateBudgetCostItem(editingId, input);
        setItems((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await createBudgetCostItem(input);
        setItems((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać kosztu.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleToggleActive(item: BudgetCostItem) {
    setBusyId(item.id);
    try {
      const updated = await updateBudgetCostItem(item.id, { isActive: !item.isActive });
      setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaktualizować kosztu.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: BudgetCostItem) {
    setBusyId(item.id);
    try {
      await deleteBudgetCostItem(item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć kosztu.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie kosztów...</p>;
  }

  return (
    <div className="grid gap-4">
      {canManage ? (
        <div className="flex justify-end">
          <Button type="button" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Dodaj koszt
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted">Brak pozycji kosztowych.</CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border/80 md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-surface-muted/20 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Nazwa</th>
                  <th className="px-4 py-3 font-medium">Kategoria</th>
                  <th className="px-4 py-3 text-right font-medium">Kwota</th>
                  <th className="px-4 py-3 font-medium">Cykliczność</th>
                  <th className="px-4 py-3 font-medium">Aktywny</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={cn("border-b border-border/40", !item.isActive && "opacity-50")}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {item.name}
                      {item.notes ? <p className="text-xs font-normal text-muted">{item.notes}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-muted">{BUDGET_COST_CATEGORY_LABELS[item.category]}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{formatMoney(item.amount)}</td>
                    <td className="px-4 py-3 text-muted">
                      {BUDGET_COST_CADENCE_LABELS[item.cadence]}
                      {item.cadence === "every_n_months" ? ` (${item.intervalMonths})` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border accent-blue-500 disabled:opacity-50"
                        checked={item.isActive}
                        disabled={!canManage || busyId === item.id}
                        onChange={() => void handleToggleActive(item)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => openEditDialog(item)}>
                            Edytuj
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={busyId === item.id}
                            onClick={() => void handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {items.map((item) => (
              <Card key={item.id} className={cn(!item.isActive && "opacity-50")}>
                <CardContent className="grid gap-2 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <Badge tone={item.isActive ? "active" : "closed"}>
                      {item.isActive ? "Aktywny" : "Wyłączony"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {BUDGET_COST_CATEGORY_LABELS[item.category]} · {formatMoney(item.amount)} ·{" "}
                    {BUDGET_COST_CADENCE_LABELS[item.cadence]}
                  </p>
                  {canManage ? (
                    <div className="mt-1 flex gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => openEditDialog(item)}>
                        Edytuj
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() => void handleDelete(item)}
                      >
                        Usuń
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj koszt" : "Nowy koszt"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
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
              <Field label="Kwota (zł)">
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
            <Button type="button" onClick={() => void handleSaveDraft()} disabled={savingDraft || !draft.name.trim()}>
              {savingDraft ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
