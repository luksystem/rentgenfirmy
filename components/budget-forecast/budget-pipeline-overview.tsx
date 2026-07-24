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
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { hasFullAppAccess } from "@/lib/auth/types";
import {
  createProjectRevenueForecast,
  deleteProjectRevenueForecast,
  fetchAllProjectRevenueForecastsWithProjectNames,
  updateProjectRevenueForecast,
} from "@/lib/supabase/project-revenue-forecast-repository";
import {
  BUDGET_CONFIDENCE_LABELS,
  BUDGET_CONFIDENCE_LEVELS,
  currentMonthKey,
  type BudgetConfidenceLevel,
  type ProjectRevenueForecastWithProject,
} from "@/lib/budget-forecast/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { BudgetPipelineImportDialog } from "@/components/budget-forecast/budget-pipeline-import-dialog";

const CONFIDENCE_BADGE_TONE: Record<BudgetConfidenceLevel, "active" | "blue" | "waiting" | "neutral" | "closed"> = {
  ok: "active",
  high: "blue",
  medium: "waiting",
  low: "neutral",
  frozen: "closed",
};

type DraftState = {
  projectId: string;
  date: string;
  amount: string;
  confidence: BudgetConfidenceLevel;
  notes: string;
};

function emptyDraft(defaultProjectId: string): DraftState {
  return {
    projectId: defaultProjectId,
    date: `${currentMonthKey().slice(0, 7)}-01`,
    amount: "",
    confidence: "medium",
    notes: "",
  };
}

function draftFromEntry(entry: ProjectRevenueForecastWithProject): DraftState {
  return {
    projectId: entry.projectId,
    date: entry.expectedDate.slice(0, 10),
    amount: String(entry.amountGross),
    confidence: entry.confidence,
    notes: entry.notes,
  };
}

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft(""));
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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

  function openCreateDialog() {
    setEditingId(null);
    setDraft(emptyDraft(activeProjects[0]?.id ?? ""));
    setDialogOpen(true);
  }

  function openEditDialog(entry: ProjectRevenueForecastWithProject) {
    setEditingId(entry.id);
    setDraft(draftFromEntry(entry));
    setDialogOpen(true);
  }

  async function handleSaveDraft() {
    if (!draft.projectId) return;
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
          prev.map((entry) => (entry.id === editingId ? { ...entry, ...updated } : entry)),
        );
      } else {
        await createProjectRevenueForecast({
          projectId: draft.projectId,
          expectedDate: draft.date,
          amountGross: Number(draft.amount) || 0,
          confidence: draft.confidence,
          notes: draft.notes.trim(),
        });
        reload();
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
    return <p className="text-sm text-muted">Ładowanie pipeline...</p>;
  }

  return (
    <div className="grid gap-4">
      {canManage ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setImportOpen(true)}>
            Pobierz z harmonogramu
          </Button>
          <Button type="button" onClick={openCreateDialog}>
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
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 text-right font-medium">Kwota</th>
                  <th className="px-4 py-3 font-medium">Pewność</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/40">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {entry.projectName}
                      {entry.notes ? <p className="text-xs font-normal text-muted">{entry.notes}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(entry.expectedDate)}</td>
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
                        <div className="flex justify-end gap-2">
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
                        </div>
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
                    {formatDate(entry.expectedDate)} · {formatMoney(entry.amountGross)}
                  </p>
                  {entry.notes ? <p className="text-sm text-muted">{entry.notes}</p> : null}
                  {canManage ? (
                    <div className="mt-1 flex gap-2">
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
            <DialogTitle>{editingId ? "Edytuj spodziewany wpływ" : "Nowy spodziewany wpływ"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <Field label="Projekt">
              <Select
                value={draft.projectId}
                disabled={Boolean(editingId)}
                onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}
              >
                {activeProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>

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
              <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={() => void handleSaveDraft()} disabled={saving || !draft.projectId}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BudgetPipelineImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        projects={activeProjects}
        onImported={reload}
      />
    </div>
  );
}
