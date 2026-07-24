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
import { Field, Input, Select } from "@/components/ui/input";
import {
  BUDGET_CONFIDENCE_LABELS,
  BUDGET_CONFIDENCE_LEVELS,
  currentMonthKey,
  type BudgetConfidenceLevel,
  type ProjectRevenueForecast,
} from "@/lib/budget-forecast/types";
import {
  createProjectRevenueForecast,
  deleteProjectRevenueForecast,
  fetchProjectRevenueForecasts,
} from "@/lib/supabase/project-revenue-forecast-repository";
import { formatMoney } from "@/lib/utils";

const CONFIDENCE_BADGE_TONE: Record<BudgetConfidenceLevel, "active" | "blue" | "waiting" | "neutral" | "closed"> = {
  ok: "active",
  high: "blue",
  medium: "waiting",
  low: "neutral",
  frozen: "closed",
};

export function ProjectRevenueForecastPanel({
  projectId,
  readOnly = false,
}: {
  projectId: string;
  readOnly?: boolean;
}) {
  const [entries, setEntries] = useState<ProjectRevenueForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState(currentMonthKey().slice(0, 7));
  const [draftAmount, setDraftAmount] = useState("");
  const [draftConfidence, setDraftConfidence] = useState<BudgetConfidenceLevel>("medium");
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    reload();
  }, [projectId]);

  function reload() {
    setLoading(true);
    setError(null);
    void fetchProjectRevenueForecasts(projectId)
      .then(setEntries)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Nie udało się wczytać prognozy."))
      .finally(() => setLoading(false));
  }

  function openDialog() {
    setDraftMonth(currentMonthKey().slice(0, 7));
    setDraftAmount("");
    setDraftConfidence("medium");
    setDraftNotes("");
    setDialogOpen(true);
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const created = await createProjectRevenueForecast({
        projectId,
        expectedMonth: `${draftMonth}-01`,
        amountGross: Number(draftAmount) || 0,
        confidence: draftConfidence,
        notes: draftNotes.trim(),
      });
      setEntries((prev) => [...prev, created].sort((a, b) => a.expectedMonth.localeCompare(b.expectedMonth)));
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dodać pozycji.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await deleteProjectRevenueForecast(id);
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć pozycji.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie prognozy wpływów...</p>;
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Spodziewane wpływy z tego projektu, jeszcze niezafakturowane — kwota, miesiąc i poziom pewności.
        Wchodzą do firmowej prognozy płynności ważone pewnością.
      </p>

      {!readOnly ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={openDialog}>
            <Plus className="h-4 w-4" />
            Dodaj spodziewany wpływ
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted">
            Brak spodziewanych wpływów dla tego projektu.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium text-foreground">
                    {formatMoney(entry.amountGross)} · {entry.expectedMonth.slice(0, 7)}
                  </p>
                  {entry.notes ? <p className="text-sm text-muted">{entry.notes}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={CONFIDENCE_BADGE_TONE[entry.confidence]}>
                    {BUDGET_CONFIDENCE_LABELS[entry.confidence]}
                  </Badge>
                  {!readOnly ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={busyId === entry.id}
                      onClick={() => void handleDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowy spodziewany wpływ</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Miesiąc">
                <Input type="month" value={draftMonth} onChange={(e) => setDraftMonth(e.target.value)} />
              </Field>
              <Field label="Kwota (zł)">
                <Input
                  type="number"
                  step="0.01"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Pewność">
              <Select
                value={draftConfidence}
                onChange={(e) => setDraftConfidence(e.target.value as BudgetConfidenceLevel)}
              >
                {BUDGET_CONFIDENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {BUDGET_CONFIDENCE_LABELS[level]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Notatki (opcjonalnie)">
              <Input value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={saving}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
