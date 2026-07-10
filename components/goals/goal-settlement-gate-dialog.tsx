"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  GOAL_SETTLEMENT_STATUS_LABELS,
  GOAL_SETTLEMENT_STATUSES,
  type Goal,
  type GoalKpi,
  type GoalMethodology,
  type GoalSettlementStatus,
} from "@/lib/goals/types";
import { fetchGoalKpis, settleGoal, upsertGoalKpi } from "@/lib/supabase/goal-repository";
import { fetchGoalMethodologyByCode } from "@/lib/supabase/goal-methodology-repository";

/**
 * Bramka rozliczenia celu — otwierana przy przeciągnięciu/zmianie statusu na „Rozliczony”,
 * jeśli cel ma przypisaną metodologię. Wymusza przegląd kluczowych wyników (KPI) i kryteriów
 * sukcesu założonych przez metodologię, zanim cel faktycznie przejdzie do statusu „settled”.
 */
export function GoalSettlementGateDialog({
  goal,
  open,
  onOpenChange,
  currentProfileId,
  onSettled,
}: {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfileId: string | null;
  onSettled: () => void;
}) {
  const [methodology, setMethodology] = useState<GoalMethodology | null>(null);
  const [kpis, setKpis] = useState<GoalKpi[]>([]);
  const [kpiValues, setKpiValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [settlementStatus, setSettlementStatus] = useState<GoalSettlementStatus>("achieved");
  const [whatWorked, setWhatWorked] = useState("");
  const [whatFailed, setWhatFailed] = useState("");
  const [conclusions, setConclusions] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !goal) return;
    setLoading(true);
    setError(null);
    setSettlementStatus(goal.settlementStatus ?? "achieved");
    setWhatWorked(goal.settlementWhatWorked ?? "");
    setWhatFailed(goal.settlementWhatFailed ?? "");
    setConclusions(goal.settlementConclusions ?? "");
    setConfirmed(false);
    void (async () => {
      try {
        const [methodologyRecord, kpiList] = await Promise.all([
          goal.methodologyId ? fetchGoalMethodologyByCode(goal.methodologyId) : Promise.resolve(null),
          fetchGoalKpis(goal.id),
        ]);
        setMethodology(methodologyRecord);
        setKpis(kpiList);
        setKpiValues(Object.fromEntries(kpiList.map((kpi) => [kpi.id, String(kpi.currentValue)])));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać danych metodologii.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, goal]);

  async function handleSubmit() {
    if (!goal) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        kpis.map((kpi) => {
          const nextValue = Number(kpiValues[kpi.id] ?? kpi.currentValue);
          if (!Number.isFinite(nextValue) || nextValue === kpi.currentValue) return Promise.resolve();
          return upsertGoalKpi({ ...kpi, currentValue: nextValue }).then(() => undefined);
        }),
      );
      await settleGoal({
        id: goal.id,
        settlementStatus,
        settlementWhatWorked: whatWorked,
        settlementWhatFailed: whatFailed,
        settlementConclusions: conclusions,
        settledBy: currentProfileId,
      });
      onSettled();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się rozliczyć celu.");
    } finally {
      setSaving(false);
    }
  }

  if (!goal) return null;

  const requiresConfirmation = Boolean(methodology);

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rozliczenie celu: {goal.name}</DialogTitle>
          <DialogDescription>
            {methodology
              ? `Zanim cel przejdzie do statusu „Rozliczony”, potwierdź kluczowe wyniki i kryteria sukcesu zgodne z metodologią „${methodology.name}”.`
              : "Potwierdź wynik rozliczenia celu."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Wczytywanie...
          </div>
        ) : (
          <div className="grid gap-4">
            {methodology && methodology.fieldSchema.length > 0 ? (
              <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Definicja celu wg metodologii {methodology.name}
                </p>
                <div className="grid gap-2">
                  {methodology.fieldSchema.map((field) => (
                    <div key={field.key} className="text-sm">
                      <span className="text-muted">{field.label}: </span>
                      <span className="text-foreground/90">
                        {String(goal.methodologyFields[field.key] ?? "—")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {kpis.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Kluczowe wyniki (Key Results) — potwierdź wartości końcowe
                </p>
                {kpis.map((kpi) => (
                  <div
                    key={kpi.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-muted/20 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{kpi.name}</p>
                      <p className="text-xs text-muted">
                        Cel: {kpi.targetValue ?? "—"} {kpi.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      className="h-9 w-28"
                      value={kpiValues[kpi.id] ?? ""}
                      onChange={(event) =>
                        setKpiValues((current) => ({ ...current, [kpi.id]: event.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <Field label="Wynik rozliczenia">
              <Select
                value={settlementStatus}
                onChange={(event) => setSettlementStatus(event.target.value as GoalSettlementStatus)}
              >
                {GOAL_SETTLEMENT_STATUSES.map((entry) => (
                  <option key={entry} value={entry}>
                    {GOAL_SETTLEMENT_STATUS_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Co się udało">
              <Textarea value={whatWorked} onChange={(event) => setWhatWorked(event.target.value)} rows={2} />
            </Field>
            <Field label="Co się nie udało">
              <Textarea value={whatFailed} onChange={(event) => setWhatFailed(event.target.value)} rows={2} />
            </Field>
            <Field label="Wnioski">
              <Textarea value={conclusions} onChange={(event) => setConclusions(event.target.value)} rows={2} />
            </Field>

            {requiresConfirmation ? (
              <label className="flex items-center gap-2 text-sm text-foreground/90">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Potwierdzam, że kryteria sukcesu i kluczowe wyniki zostały zweryfikowane.
              </label>
            ) : null}

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                Anuluj
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={saving || (requiresConfirmation && !confirmed)}
              >
                {saving ? "Zapisywanie..." : "Zaakceptuj i rozlicz"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
