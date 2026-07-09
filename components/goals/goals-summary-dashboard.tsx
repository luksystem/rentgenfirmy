"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarPanel, PiePanel } from "@/components/charts";
import { fetchGoalReportingDataset } from "@/lib/supabase/goal-history-repository";
import {
  GOAL_PRIORITY_LABELS,
  GOAL_STATUS_LABELS,
  isGoalOverdue,
  type Goal,
} from "@/lib/goals/types";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import { formatDate } from "@/lib/utils";
import { useGoalStore } from "@/store/goal-store";

const ACTIVE_STATUSES = ["planned", "in_progress", "at_risk", "on_hold"] as const;

export function GoalsSummaryDashboard() {
  const boards = useGoalStore((state) => state.boards);
  const boardKinds = useGoalStore((state) => state.boardKinds);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const dataset = await fetchGoalReportingDataset();
        setGoals(dataset.goals);
        setTeamProfiles(dataset.teamProfiles);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać danych.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const boardsById = useMemo(() => new Map(boards.map((board) => [board.id, board])), [boards]);
  const kindsByCode = useMemo(() => new Map(boardKinds.map((kind) => [kind.code, kind])), [boardKinds]);
  const nameByOwner = useMemo(() => new Map(teamProfiles.map((p) => [p.id, getUserDisplayName(p)])), [
    teamProfiles,
  ]);

  const activeGoals = useMemo(
    () => goals.filter((goal) => (ACTIVE_STATUSES as readonly string[]).includes(goal.status)),
    [goals],
  );

  const avgProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0;
    const sum = activeGoals.reduce((acc, goal) => acc + goal.progressPercent, 0);
    return Math.round(sum / activeGoals.length);
  }, [activeGoals]);

  const progressByBoardKind = useMemo(() => {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const goal of activeGoals) {
      const board = boardsById.get(goal.boardId);
      const kindLabel = board ? kindsByCode.get(board.kind)?.label ?? board.kind : "Nieznana";
      const bucket = buckets.get(kindLabel) ?? { sum: 0, count: 0 };
      bucket.sum += goal.progressPercent;
      bucket.count += 1;
      buckets.set(kindLabel, bucket);
    }
    return Array.from(buckets.entries())
      .map(([name, { sum, count }]) => ({ name, value: Math.round(sum / count) }))
      .sort((a, b) => b.value - a.value);
  }, [activeGoals, boardsById, kindsByCode]);

  const progressByOwner = useMemo(() => {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const goal of activeGoals) {
      if (!goal.ownerId) continue;
      const name = nameByOwner.get(goal.ownerId) ?? "Nieznany";
      const bucket = buckets.get(name) ?? { sum: 0, count: 0 };
      bucket.sum += goal.progressPercent;
      bucket.count += 1;
      buckets.set(name, bucket);
    }
    return Array.from(buckets.entries())
      .map(([name, { sum, count }]) => ({ name, value: Math.round(sum / count) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [activeGoals, nameByOwner]);

  const statusDistribution = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const goal of activeGoals) {
      const label = GOAL_STATUS_LABELS[goal.status];
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([name, value]) => ({ name, value }));
  }, [activeGoals]);

  const priorityDistribution = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const goal of activeGoals) {
      const label = GOAL_PRIORITY_LABELS[goal.priority];
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([name, value]) => ({ name, value }));
  }, [activeGoals]);

  const redFlagGoals = useMemo(
    () =>
      activeGoals
        .filter((goal) => goal.status === "at_risk" || isGoalOverdue(goal))
        .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd)),
    [activeGoals],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie podsumowania...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Aktywne cele" value={String(activeGoals.length)} />
        <SummaryStat label="Śr. realizacja" value={`${avgProgress}%`} />
        <SummaryStat label="Zagrożone" value={String(activeGoals.filter((g) => g.status === "at_risk").length)} />
        <SummaryStat label="Wymagają uwagi" value={String(redFlagGoals.length)} tone="critical" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarPanel title="% realizacji per typ tablicy" data={progressByBoardKind} />
        <BarPanel title="% realizacji per osoba" data={progressByOwner} />
        <PiePanel title="Rozkład statusów" data={statusDistribution} />
        <PiePanel title="Rozkład priorytetów" data={priorityDistribution} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            Cele wymagające uwagi ({redFlagGoals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {redFlagGoals.length === 0 ? (
            <p className="text-sm text-muted">Brak celów zagrożonych lub po terminie — dobra robota.</p>
          ) : (
            redFlagGoals.map((goal) => (
              <Link
                key={goal.id}
                href={`/tablice-celow/${goal.boardId}/${goal.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm transition hover:border-accent/40"
              >
                <div>
                  <p className="font-medium text-foreground">{goal.name}</p>
                  <p className="text-xs text-muted">
                    {nameByOwner.get(goal.ownerId ?? "") ?? "Brak właściciela"} · termin{" "}
                    {formatDate(goal.periodEnd)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={goal.status === "at_risk" ? "critical" : "waiting"}>
                    {isGoalOverdue(goal) ? "Po terminie" : GOAL_STATUS_LABELS[goal.status]}
                  </Badge>
                  <span className="text-xs text-muted">{goal.progressPercent}%</span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "critical";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className={tone === "critical" ? "mt-1 text-2xl font-bold text-rose-400" : "mt-1 text-2xl font-bold text-foreground"}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
