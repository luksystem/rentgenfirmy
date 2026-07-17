"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import type {
  ProjectTimeEntryRow,
  ProjectTimeSummary,
} from "@/lib/time-tracking/project-time-summary";
import type { ProjectHourBudgetSummary } from "@/lib/time-tracking/project-hour-budget";
import { ProjectHourBudgetCard } from "@/components/time-tracking/project-hour-budget-card";
import { TIME_ENTRY_STATUS_LABELS } from "@/lib/time-tracking/types";
import { formatDate } from "@/lib/utils";

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
  const [entries, setEntries] = useState<ProjectTimeEntryRow[]>([]);
  const [summary, setSummary] = useState<ProjectTimeSummary | null>(null);
  const [hourBudget, setHourBudget] = useState<ProjectHourBudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch(`/api/projects/${encodeURIComponent(projectId)}/time-entries`, {
      credentials: "include",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          entries?: ProjectTimeEntryRow[];
          summary?: ProjectTimeSummary;
          hourBudget?: ProjectHourBudgetSummary | null;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Nie udało się wczytać czasu pracy.");
        }
        if (!cancelled) {
          setEntries(payload.entries ?? []);
          setSummary(payload.summary ?? null);
          setHourBudget(payload.hourBudget ?? null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nie udało się wczytać czasu pracy.");
          setEntries([]);
          setSummary(null);
          setHourBudget(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie czasu pracy…</p>;
  }

  if (error) {
    return <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {hourBudget ? <ProjectHourBudgetCard budget={hourBudget} /> : null}
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Łącznie w projekcie</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {formatDurationMinutes(summary?.totalMinutes ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {summary?.entryCount ?? 0}{" "}
              {(summary?.entryCount ?? 0) === 1 ? "wpis" : "wpisów"}
            </p>
          </CardContent>
        </Card>

        {(summary?.byStage ?? []).slice(0, 2).map((stage) => (
          <Card key={stage.stageId ?? stage.stageTitle}>
            <CardContent className="py-4">
              <p className="line-clamp-2 text-xs font-medium uppercase tracking-wide text-muted">
                {stage.stageTitle}
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {formatDurationMinutes(stage.totalMinutes)}
              </p>
              <p className="mt-1 text-xs text-muted">{stage.entryCount} wpisów</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary && summary.byStage.length > 0 ? (
        <Card>
          <CardContent className="grid gap-3 py-4">
            <p className="text-sm font-semibold text-foreground">Podsumowanie według etapów procesu</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-2 py-2 font-medium">Etap</th>
                    <th className="px-2 py-2 font-medium">Wpisy</th>
                    <th className="px-2 py-2 font-medium">Czas</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byStage.map((stage) => (
                    <tr key={stage.stageId ?? stage.stageTitle} className="border-b border-border/40">
                      <td className="px-2 py-2 text-foreground">{stage.stageTitle}</td>
                      <td className="px-2 py-2 text-muted">{stage.entryCount}</td>
                      <td className="px-2 py-2 font-medium text-foreground">
                        {formatDurationMinutes(stage.totalMinutes)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-2 py-2 font-semibold text-foreground">Razem</td>
                    <td className="px-2 py-2 font-semibold text-muted">{summary.entryCount}</td>
                    <td className="px-2 py-2 font-semibold text-foreground">
                      {formatDurationMinutes(summary.totalMinutes)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted">
            Brak zarejestrowanego czasu pracy w tym projekcie.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm font-semibold text-foreground">Wszystkie wpisy</p>
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.categoryColor }}
                      aria-hidden
                    />
                    <p className="font-medium text-foreground">
                      {entry.categoryName} · {entry.entryTypeName}
                    </p>
                    <Badge tone={statusTone(entry.status)}>
                      {TIME_ENTRY_STATUS_LABELS[entry.status]}
                    </Badge>
                    {entry.billable ? <Badge tone="blue">Do rozliczenia</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(entry.date)} · {formatDurationMinutes(entry.durationMinutes)} ·{" "}
                    {entry.userDisplayName}
                    {entry.processStageTitle ? ` · ${entry.processStageTitle}` : ""}
                  </p>
                  {entry.description ? (
                    <p className="mt-2 text-sm text-foreground/90">{entry.description}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
