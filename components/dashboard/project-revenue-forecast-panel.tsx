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
  updateProjectRevenueForecast,
} from "@/lib/supabase/project-revenue-forecast-repository";
import { formatDate, formatMoney } from "@/lib/utils";

const CONFIDENCE_BADGE_TONE: Record<BudgetConfidenceLevel, "active" | "blue" | "waiting" | "neutral" | "closed"> = {
  ok: "active",
  high: "blue",
  medium: "waiting",
  low: "neutral",
  frozen: "closed",
};

type DraftState = {
  date: string;
  amount: string;
  confidence: BudgetConfidenceLevel;
  notes: string;
};

function emptyDraft(): DraftState {
  return {
    date: `${currentMonthKey().slice(0, 7)}-01`,
    amount: "",
    confidence: "medium",
    notes: "",
  };
}

function draftFromEntry(entry: ProjectRevenueForecast): DraftState {
  return {
    date: entry.expectedDate.slice(0, 10),
    amount: String(entry.amountGross),
    confidence: entry.confidence,
    notes: entry.notes,
  };
}

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
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

  function openCreateDialog() {
    setEditingId(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  }

  function openEditDialog(entry: ProjectRevenueForecast) {
    setEditingId(entry.id);
    setDraft(draftFromEntry(entry));
    setDialogOpen(true);
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await updateProjectRevenueForecast(editingId, {
          expectedDate: draft.date,
          amountGross: Number(draft.amount) || 0,
          confidence: draft.confidence,
          notes: draft.notes.trim(),
        });
        setEntries((prev) =>
          prev
            .map((entry) => (entry.id === editingId ? updated : entry))
            .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate)),
        );
      } else {
        const created = await createProjectRevenueForecast({
          projectId,
          expectedDate: draft.date,
          amountGross: Number(draft.amount) || 0,
          confidence: draft.confidence,
          notes: draft.notes.trim(),
        });
        setEntries((prev) => [...prev, created].sort((a, b) => a.expectedDate.localeCompare(b.expectedDate)));
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać pozycji.");
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
        Spodziewane wpływy z tego projektu, jeszcze niezafakturowane — kwota, data i poziom pewności.
        Wchodzą do firmowej prognozy płynności ważone pewnością.
      </p>

      {!readOnly ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={openCreateDialog}>
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
                    {formatMoney(entry.amountGross)} · {formatDate(entry.expectedDate)}
                  </p>
                  {entry.notes ? <p className="text-sm text-muted">{entry.notes}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={CONFIDENCE_BADGE_TONE[entry.confidence]}>
                    {BUDGET_CONFIDENCE_LABELS[entry.confidence]}
                  </Badge>
                  {!readOnly ? (
                    <>
                      <Button type="button" variant="secondary" size="sm" onClick={() => openEditDialog(entry)}>
                        Edytuj
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busyId === entry.id}
                        onClick={() => void handleDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
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
            <DialogTitle>{editingId ? "Edytuj spodziewany wpływ" : "Nowy spodziewany wpływ"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data">
                <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
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

            <Field label="Pewność">
              <Select
                value={draft.confidence}
                onChange={(e) => setDraft({ ...draft, confidence: e.target.value as BudgetConfidenceLevel })}
              >
                {BUDGET_CONFIDENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {BUDGET_CONFIDENCE_LABELS[level]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Notatki (opcjonalnie)">
              <Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={() => void handleSaveDraft()} disabled={saving}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
