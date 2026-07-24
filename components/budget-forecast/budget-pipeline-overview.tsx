"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasFullAppAccess } from "@/lib/auth/types";
import { fetchAllProjectRevenueForecastsWithProjectNames } from "@/lib/supabase/project-revenue-forecast-repository";
import {
  BUDGET_CONFIDENCE_LABELS,
  type BudgetConfidenceLevel,
  type ProjectRevenueForecastWithProject,
} from "@/lib/budget-forecast/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { BudgetPipelineEntryDialog } from "@/components/budget-forecast/budget-pipeline-entry-dialog";

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProjectRevenueForecastWithProject | null>(null);

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
    setEditingEntry(null);
    setDialogOpen(true);
  }

  function openEditDialog(entry: ProjectRevenueForecastWithProject) {
    setEditingEntry(entry);
    setDialogOpen(true);
  }

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie pipeline...</p>;
  }

  return (
    <div className="grid gap-4">
      {canManage ? (
        <div className="flex flex-wrap justify-end gap-2">
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
            Brak pozycji pipeline. Dodaj je tutaj lub z poziomu Timesheetu.
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
                  <th className="px-4 py-3 text-right font-medium">Kwota netto</th>
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
                      {formatMoney(entry.amountNet)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={CONFIDENCE_BADGE_TONE[entry.confidence]}>
                        {BUDGET_CONFIDENCE_LABELS[entry.confidence]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <Button type="button" variant="secondary" size="sm" onClick={() => openEditDialog(entry)}>
                          Edytuj
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
                    {formatDate(entry.expectedDate)} · {formatMoney(entry.amountNet)}
                  </p>
                  {entry.notes ? <p className="text-sm text-muted">{entry.notes}</p> : null}
                  {canManage ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-1 w-fit"
                      onClick={() => openEditDialog(entry)}
                    >
                      Edytuj
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <BudgetPipelineEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={activeProjects}
        entry={editingEntry}
        onSaved={reload}
        onDeleted={reload}
        onImported={reload}
      />
    </div>
  );
}
