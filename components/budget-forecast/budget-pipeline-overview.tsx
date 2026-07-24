"use client";

import { useEffect, useMemo, useState } from "react";
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
import { hasFullAppAccess } from "@/lib/auth/types";
import {
  createProjectRevenueForecast,
  deleteProjectRevenueForecast,
  fetchAllProjectRevenueForecastsWithProjectNames,
} from "@/lib/supabase/project-revenue-forecast-repository";
import {
  BUDGET_CONFIDENCE_LABELS,
  BUDGET_CONFIDENCE_LEVELS,
  currentMonthKey,
  type BudgetConfidenceLevel,
  type ProjectRevenueForecastWithProject,
} from "@/lib/budget-forecast/types";
import { formatMoney } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

const CONFIDENCE_BADGE_TONE: Record<BudgetConfidenceLevel, "active" | "blue" | "waiting" | "neutral" | "closed"> = {
  ok: "active",
  high: "blue",
  medium: "waiting",
  low: "neutral",
  frozen: "closed",
};

export function BudgetPipelineOverview() {
  const profile = useAuthStore((state) => state.profile);
  const canManage = Boolean(profile && hasFullAppAccess(profile.role));
  const projects = useAppStore((state) => state.projects);
  const activeProjects = useMemo(
    () => [...projects].filter((p) => p.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    [projects],
  );

  const [entries, setEntries] = useState<ProjectRevenueForecastWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftMonth, setDraftMonth] = useState(currentMonthKey().slice(0, 7));
  const [draftAmount, setDraftAmount] = useState("");
  const [draftConfidence, setDraftConfidence] = useState<BudgetConfidenceLevel>("medium");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    reload();
  }, []);

  function reload() {
    setLoading(true);
    setError(null);
    void fetchAllProjectRevenueForecastsWithProjectNames()
      .then(setEntries)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Nie udało się wczytać pipeline."))
      .finally(() => setLoading(false));
  }

  function openDialog() {
    setDraftProjectId(activeProjects[0]?.id ?? "");
    setDraftMonth(currentMonthKey().slice(0, 7));
    setDraftAmount("");
    setDraftConfidence("medium");
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!draftProjectId) return;
    setSaving(true);
    setError(null);
    try {
      await createProjectRevenueForecast({
        projectId: draftProjectId,
        expectedMonth: `${draftMonth}-01`,
        amountGross: Number(draftAmount) || 0,
        confidence: draftConfidence,
      });
      setDialogOpen(false);
      reload();
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
    return <p className="text-sm text-muted">Ładowanie pipeline...</p>;
  }

  return (
    <div className="grid gap-4">
      {canManage ? (
        <div className="flex justify-end">
          <Button type="button" onClick={openDialog}>
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
          <CardContent className="py-8 text-center text-sm text-muted">
            Brak pozycji pipeline. Dodaj je tutaj lub z poziomu strony projektu.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border/80 md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-surface-muted/20 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Projekt</th>
                  <th className="px-4 py-3 font-medium">Miesiąc</th>
                  <th className="px-4 py-3 text-right font-medium">Kwota</th>
                  <th className="px-4 py-3 font-medium">Pewność</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/40">
                    <td className="px-4 py-3 font-medium text-foreground">{entry.projectName}</td>
                    <td className="px-4 py-3 text-muted">{entry.expectedMonth.slice(0, 7)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {formatMoney(entry.amountGross)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={CONFIDENCE_BADGE_TONE[entry.confidence]}>
                        {BUDGET_CONFIDENCE_LABELS[entry.confidence]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="grid gap-2 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{entry.projectName}</p>
                    <Badge tone={CONFIDENCE_BADGE_TONE[entry.confidence]}>
                      {BUDGET_CONFIDENCE_LABELS[entry.confidence]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {entry.expectedMonth.slice(0, 7)} · {formatMoney(entry.amountGross)}
                  </p>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-1 w-fit"
                      disabled={busyId === entry.id}
                      onClick={() => void handleDelete(entry.id)}
                    >
                      Usuń
                    </Button>
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
            <DialogTitle>Nowy spodziewany wpływ</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <Field label="Projekt">
              <Select value={draftProjectId} onChange={(e) => setDraftProjectId(e.target.value)}>
                {activeProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>

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
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={saving || !draftProjectId}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
