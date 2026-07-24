"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasFullAppAccess } from "@/lib/auth/types";
import { fetchAllBudgetCostItems, updateBudgetCostItem } from "@/lib/supabase/budget-cost-item-repository";
import {
  BUDGET_COST_CADENCE_LABELS,
  BUDGET_COST_CATEGORY_LABELS,
  type BudgetCostItem,
} from "@/lib/budget-forecast/types";
import { cn, formatMoney } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { BudgetCostItemDialog } from "@/components/budget-forecast/budget-cost-item-dialog";

export function BudgetCostItemsManager() {
  const profile = useAuthStore((state) => state.profile);
  const canManage = Boolean(profile && hasFullAppAccess(profile.role));

  const [items, setItems] = useState<BudgetCostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetCostItem | null>(null);

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
    setEditingItem(null);
    setDialogOpen(true);
  }

  function openEditDialog(item: BudgetCostItem) {
    setEditingItem(item);
    setDialogOpen(true);
  }

  function handleSaved(saved: BudgetCostItem) {
    setItems((prev) => {
      const exists = prev.some((item) => item.id === saved.id);
      return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
    });
  }

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
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
                  <th className="px-4 py-3 text-right font-medium">Kwota netto</th>
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
                    <Button type="button" variant="secondary" size="sm" className="mt-1 w-fit" onClick={() => openEditDialog(item)}>
                      Edytuj
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <BudgetCostItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
