"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BUDGET_SCENARIO_EFFECT_TYPE_LABELS,
  type BudgetScenarioAction,
} from "@/lib/budget-forecast/types";
import {
  fetchAllBudgetScenarioActions,
  updateBudgetScenarioAction,
} from "@/lib/supabase/budget-scenario-action-repository";
import { cn, formatMoney } from "@/lib/utils";
import { BudgetScenarioActionDialog } from "@/components/budget-forecast/budget-scenario-action-dialog";

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
  actions: actionsProp,
  onActionsChange,
  canManage,
  compact = false,
}: {
  /** Gdy pominięte — panel sam pobiera i zarządza swoją listą (tryb samodzielny, np. w Timesheet). */
  actions?: BudgetScenarioAction[];
  onActionsChange?: (next: BudgetScenarioAction[]) => void;
  canManage: boolean;
  /** Wersja skrócona — bez opisu, krótsza lista (np. obok innych przycisków szybkiego dodawania). */
  compact?: boolean;
}) {
  const isControlled = actionsProp !== undefined;
  const [ownActions, setOwnActions] = useState<BudgetScenarioAction[]>([]);
  const [ownLoading, setOwnLoading] = useState(!isControlled);
  const actions = isControlled ? actionsProp : ownActions;

  function updateActions(next: BudgetScenarioAction[]) {
    if (onActionsChange) onActionsChange(next);
    if (!isControlled) setOwnActions(next);
  }

  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<BudgetScenarioAction | null>(null);

  useEffect(() => {
    if (isControlled) return;
    setOwnLoading(true);
    void fetchAllBudgetScenarioActions()
      .then(setOwnActions)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Nie udało się wczytać akcji."))
      .finally(() => setOwnLoading(false));
    // Tryb samodzielny pobiera tylko raz przy montowaniu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateDialog() {
    setEditingAction(null);
    setDialogOpen(true);
  }

  function openEditDialog(action: BudgetScenarioAction) {
    setEditingAction(action);
    setDialogOpen(true);
  }

  function handleSaved(saved: BudgetScenarioAction) {
    const exists = actions.some((item) => item.id === saved.id);
    updateActions(exists ? actions.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...actions]);
  }

  function handleDeleted(id: string) {
    updateActions(actions.filter((item) => item.id !== id));
  }

  async function handleToggle(action: BudgetScenarioAction) {
    setBusyId(action.id);
    setError(null);
    // Optymistyczna aktualizacja — natychmiastowe przeliczenie prognozy bez czekania na zapis.
    updateActions(
      actions.map((item) => (item.id === action.id ? { ...item, isEnabled: !item.isEnabled } : item)),
    );
    try {
      await updateBudgetScenarioAction(action.id, { isEnabled: !action.isEnabled });
    } catch (err) {
      updateActions(actions);
      setError(err instanceof Error ? err.message : "Nie udało się przełączyć akcji.");
    } finally {
      setBusyId(null);
    }
  }

  if (!isControlled && ownLoading) {
    return <p className="text-sm text-muted">Ładowanie akcji symulacyjnych...</p>;
  }

  return (
    <Card className="min-w-0">
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
        {!compact ? (
          <p className="text-sm text-muted">
            Przełączalne „co jeśli” — np. zwolnienie pracownika, nowa umowa, redukcja kosztów. Włącz/wyłącz,
            żeby zobaczyć wpływ na wykres i tabelę na żywo, bez zapisywania osobnych scenariuszy.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {actions.length === 0 ? (
          <p className={cn("text-center text-sm text-muted", compact ? "py-2" : "py-4")}>
            Brak zdefiniowanych akcji symulacyjnych.
          </p>
        ) : (
          <div className={cn("grid gap-2", compact && "max-h-48 overflow-y-auto pr-1")}>
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
                    <Button type="button" variant="secondary" size="sm" onClick={() => openEditDialog(action)}>
                      Edytuj
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <BudgetScenarioActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={editingAction}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </Card>
  );
}
