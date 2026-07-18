"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TimeEntryFormDialog } from "@/components/time-tracking/time-entry-form-dialog";
import { TimeEntryHistoryDialog } from "@/components/time-tracking/time-entry-history-dialog";
import { ProjectHourBudgetCard } from "@/components/time-tracking/project-hour-budget-card";
import {
  canDeleteTimeEntryInUi,
  canEditTimeEntryInUi,
} from "@/lib/time-tracking/entry-actions";
import { formatDurationMinutes, toDateInputValue } from "@/lib/time-tracking/format";
import type {
  ProjectTimeEntryRow,
  ProjectTimeSummary,
} from "@/lib/time-tracking/project-time-summary";
import type { ProjectHourBudgetSummary } from "@/lib/time-tracking/project-hour-budget";
import { deleteTimeEntry } from "@/lib/supabase/time-tracking-repository";
import { TIME_ENTRY_STATUS_LABELS } from "@/lib/time-tracking/types";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useCanViewTeamTimeEntries } from "@/store/time-tracking-store";

function statusTone(status: ProjectTimeEntryRow["status"]) {
  switch (status) {
    case "approved":
      return "active" as const;
    case "submitted":
      return "waiting" as const;
    case "rejected":
      return "critical" as const;
    default:
      return "neutral" as const;
  }
}

export function ProjectTimeTrackingPanel({ projectId }: { projectId: string }) {
  const profile = useAuthStore((state) => state.profile);
  const role = profile?.role;
  const canManageTeam = useCanViewTeamTimeEntries(role);
  const actor = profile ? { id: profile.id, role: profile.role } : null;

  const [entries, setEntries] = useState<ProjectTimeEntryRow[]>([]);
  const [summary, setSummary] = useState<ProjectTimeSummary | null>(null);
  const [hourBudget, setHourBudget] = useState<ProjectHourBudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProjectTimeEntryRow | null>(null);
  const [historyEntry, setHistoryEntry] = useState<ProjectTimeEntryRow | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/time-entries`, {
        credentials: "include",
      });
      const payload = (await response.json()) as {
        entries?: ProjectTimeEntryRow[];
        summary?: ProjectTimeSummary;
        hourBudget?: ProjectHourBudgetSummary | null;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wczytać czasu pracy.");
      }
      setEntries(payload.entries ?? []);
      setSummary(payload.summary ?? null);
      setHourBudget(payload.hourBudget ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać czasu pracy.");
      setEntries([]);
      setSummary(null);
      setHourBudget(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  function openCreate() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  function openEdit(entry: ProjectTimeEntryRow) {
    setEditingEntry(entry);
    setFormOpen(true);
  }

  async function handleDelete(entry: ProjectTimeEntryRow) {
    if (!window.confirm("Usunąć ten wpis czasu?")) {
      return;
    }
    try {
      await deleteTimeEntry(entry.id);
      await loadEntries();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "Nie udało się usunąć wpisu.");
    }
  }

  const today = toDateInputValue(new Date());

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie czasu pracy…</p>;
  }

  if (error) {
    return <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>;
  }

  return (
    <>
      <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm font-semibold text-foreground">Czas pracy w projekcie</p>
          <Button type="button" size="sm" className="w-full sm:w-auto" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Dodaj czas
          </Button>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {hourBudget ? <ProjectHourBudgetCard budget={hourBudget} /> : null}
          <Card className="min-w-0 max-w-full overflow-hidden">
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Łącznie w projekcie</p>
              <p className="mt-1 break-words text-2xl font-semibold text-foreground">
                {formatDurationMinutes(summary?.totalMinutes ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {summary?.entryCount ?? 0}{" "}
                {(summary?.entryCount ?? 0) === 1 ? "wpis" : "wpisów"}
              </p>
            </CardContent>
          </Card>

          {(summary?.byStage ?? []).slice(0, 2).map((stage) => (
            <Card key={stage.stageId ?? stage.stageTitle} className="min-w-0 max-w-full overflow-hidden">
              <CardContent className="py-4">
                <p className="line-clamp-2 break-words text-xs font-medium uppercase tracking-wide text-muted">
                  {stage.stageTitle}
                </p>
                <p className="mt-1 break-words text-2xl font-semibold text-foreground">
                  {formatDurationMinutes(stage.totalMinutes)}
                </p>
                <p className="mt-1 text-xs text-muted">{stage.entryCount} wpisów</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {summary && summary.byStage.length > 0 ? (
          <Card className="min-w-0 max-w-full overflow-hidden">
            <CardContent className="grid min-w-0 gap-3 py-4">
              <p className="text-sm font-semibold text-foreground">Podsumowanie według etapów procesu</p>
              <ul className="grid min-w-0 gap-2">
                {summary.byStage.map((stage) => (
                  <li
                    key={stage.stageId ?? stage.stageTitle}
                    className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-border/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <span className="min-w-0 break-words text-sm text-foreground">{stage.stageTitle}</span>
                    <span className="shrink-0 text-sm text-muted">
                      {stage.entryCount} wpis. ·{" "}
                      <span className="font-medium text-foreground">
                        {formatDurationMinutes(stage.totalMinutes)}
                      </span>
                    </span>
                  </li>
                ))}
                <li className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-border/70 bg-surface-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="text-sm font-semibold text-foreground">Razem</span>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {summary.entryCount} wpis. · {formatDurationMinutes(summary.totalMinutes)}
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted">
              <p>Brak zarejestrowanego czasu pracy w tym projekcie.</p>
              <Button type="button" variant="outline" size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Dodaj pierwszy wpis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm font-semibold text-foreground">Wszystkie wpisy</p>
            {entries.map((entry) => {
              const editable = canEditTimeEntryInUi(actor, entry);
              const deletable = canDeleteTimeEntryInUi(actor, entry);

              return (
                <Card key={entry.id} className="min-w-0 max-w-full overflow-hidden">
                  <CardContent className="flex min-w-0 flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 max-w-full flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span
                          className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.categoryColor }}
                          aria-hidden
                        />
                        <p className="min-w-0 break-words font-medium text-foreground">
                          {entry.categoryName} · {entry.entryTypeName}
                        </p>
                        <Badge tone={statusTone(entry.status)}>
                          {TIME_ENTRY_STATUS_LABELS[entry.status]}
                        </Badge>
                        {entry.billable ? <Badge tone="blue">Do rozliczenia</Badge> : null}
                      </div>
                      <p className="mt-1 break-words text-sm text-muted">
                        {formatDate(entry.date)} · {formatDurationMinutes(entry.durationMinutes)} ·{" "}
                        {entry.userDisplayName}
                        {entry.processStageTitle ? ` · ${entry.processStageTitle}` : ""}
                      </p>
                      {entry.description ? (
                        <p className="mt-2 break-words text-sm text-foreground/90">{entry.description}</p>
                      ) : null}
                    </div>

                    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-w-0"
                        onClick={() => setHistoryEntry(entry)}
                      >
                        <History className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                        Historia
                      </Button>
                      {editable ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-w-0"
                          onClick={() => openEdit(entry)}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                          Edytuj
                        </Button>
                      ) : null}
                      {deletable ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-w-0"
                          onClick={() => void handleDelete(entry)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                          Usuń
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <TimeEntryHistoryDialog
        open={Boolean(historyEntry)}
        onOpenChange={(open) => {
          if (!open) setHistoryEntry(null);
        }}
        entryId={historyEntry?.id ?? null}
        entryLabel={
          historyEntry
            ? `${historyEntry.categoryName} · ${formatDurationMinutes(historyEntry.durationMinutes)}`
            : ""
        }
      />

      <TimeEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editingEntry}
        defaultDate={today}
        defaultProjectId={projectId}
        lockProject
        allowUserSelection={canManageTeam}
        onSaved={() => {
          void loadEntries();
        }}
      />
    </>
  );
}
