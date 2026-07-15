"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Trophy } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { fetchGoalReportingDataset } from "@/lib/supabase/goal-history-repository";
import {
  GOAL_LEVEL_LABELS,
  GOAL_LEVELS,
  GOAL_PERIOD_TYPE_LABELS,
  GOAL_PERIOD_TYPES,
  GOAL_SETTLEMENT_STATUS_LABELS,
  type Goal,
} from "@/lib/goals/types";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import { formatDate } from "@/lib/utils";
import { useGoalStore } from "@/store/goal-store";

export function GoalsHistoryInsights() {
  const boards = useGoalStore((state) => state.boards);
  const boardKinds = useGoalStore((state) => state.boardKinds);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [boardFilter, setBoardFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

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
  const nameByProfile = useMemo(
    () => new Map(teamProfiles.map((p) => [p.id, getUserDisplayName(p)])),
    [teamProfiles],
  );

  const settledGoals = useMemo(() => goals.filter((goal) => goal.settlementStatus !== null), [goals]);

  // ── 1. Ranking dowożenia celów ────────────────────────────────────────────
  const ranking = useMemo(() => {
    const buckets = new Map<
      string,
      { ownerId: string; achieved: number; partially: number; notAchieved: number }
    >();
    for (const goal of settledGoals) {
      if (!goal.ownerId) continue;
      const bucket = buckets.get(goal.ownerId) ?? {
        ownerId: goal.ownerId,
        achieved: 0,
        partially: 0,
        notAchieved: 0,
      };
      if (goal.settlementStatus === "achieved") bucket.achieved += 1;
      else if (goal.settlementStatus === "partially_achieved") bucket.partially += 1;
      else if (goal.settlementStatus === "not_achieved") bucket.notAchieved += 1;
      buckets.set(goal.ownerId, bucket);
    }
    return Array.from(buckets.values())
      .map((bucket) => {
        const total = bucket.achieved + bucket.partially + bucket.notAchieved;
        const successRate = total > 0 ? Math.round((bucket.achieved / total) * 100) : 0;
        return {
          ...bucket,
          total,
          successRate,
          name: nameByProfile.get(bucket.ownerId) ?? "Nieznany",
        };
      })
      .sort((a, b) => b.successRate - a.successRate || b.total - a.total);
  }, [settledGoals, nameByProfile]);

  // ── 2. Cele niedowiezione (z filtrami) ────────────────────────────────────
  const notAchievedGoals = useMemo(() => {
    return settledGoals
      .filter((goal) => goal.settlementStatus === "not_achieved")
      .filter((goal) => {
        if (boardFilter !== "all" && goal.boardId !== boardFilter) return false;
        if (levelFilter !== "all" && goal.level !== levelFilter) return false;
        if (periodFilter !== "all" && goal.periodType !== periodFilter) return false;
        if (ownerFilter !== "all" && goal.ownerId !== ownerFilter) return false;
        return true;
      })
      .sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? ""));
  }, [settledGoals, boardFilter, levelFilter, periodFilter, ownerFilter]);

  // ── 3. Aktywność ustalania celów (kto w ogóle tworzy cele) ────────────────
  const creationActivity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const goal of goals) {
      if (!goal.createdBy) continue;
      counts.set(goal.createdBy, (counts.get(goal.createdBy) ?? 0) + 1);
    }
    const rows = teamProfiles.map((profile) => ({
      name: getUserDisplayName(profile),
      count: counts.get(profile.id) ?? 0,
    }));
    return rows.sort((a, b) => b.count - a.count);
  }, [goals, teamProfiles]);

  // ── 4. Trend w czasie (% osiągniętych per miesiąc rozliczenia) ────────────
  const trend = useMemo(() => {
    const buckets = new Map<string, { achieved: number; total: number }>();
    for (const goal of settledGoals) {
      if (!goal.settledAt) continue;
      const month = goal.settledAt.slice(0, 7);
      const bucket = buckets.get(month) ?? { achieved: 0, total: 0 };
      bucket.total += 1;
      if (goal.settlementStatus === "achieved") bucket.achieved += 1;
      buckets.set(month, bucket);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { achieved, total }]) => ({
        month,
        rate: total > 0 ? Math.round((achieved / total) * 100) : 0,
        total,
      }));
  }, [settledGoals]);

  // ── 5. Wnioski z rozliczeń ─────────────────────────────────────────────────
  const conclusions = useMemo(
    () =>
      settledGoals
        .filter((goal) => goal.settlementConclusions?.trim())
        .sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? ""))
        .slice(0, 20),
    [settledGoals],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie historii i wniosków...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-300" />
            Ranking dowożenia celów
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted">Brak rozliczonych celów — ranking pojawi się po pierwszych rozliczeniach.</p>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1 md:mx-0 md:px-0">
              <table className="hidden w-full min-w-[560px] text-sm md:table">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2">Osoba</th>
                    <th className="px-3 py-2">Skuteczność</th>
                    <th className="px-3 py-2">Osiągnięte</th>
                    <th className="px-3 py-2">Częściowo</th>
                    <th className="px-3 py-2">Nieosiągnięte</th>
                    <th className="px-3 py-2">Rozliczonych łącznie</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((row) => (
                    <tr key={row.ownerId} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
                      <td className="px-3 py-2">
                        <Badge tone={row.successRate >= 70 ? "active" : row.successRate >= 40 ? "waiting" : "critical"}>
                          {row.successRate}%
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted">{row.achieved}</td>
                      <td className="px-3 py-2 text-muted">{row.partially}</td>
                      <td className="px-3 py-2 text-muted">{row.notAchieved}</td>
                      <td className="px-3 py-2 text-muted">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid gap-2 md:hidden">
                {ranking.map((row) => (
                  <div
                    key={row.ownerId}
                    className="rounded-xl border border-border/60 bg-surface-muted/20 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-medium">{row.name}</p>
                      <Badge tone={row.successRate >= 70 ? "active" : row.successRate >= 40 ? "waiting" : "critical"}>
                        {row.successRate}%
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {row.achieved} osiągnięte · {row.partially} częściowo · {row.notAchieved} nie · łącznie{" "}
                      {row.total}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trend realizacji w czasie</CardTitle>
        </CardHeader>
        <CardContent className="h-64 min-h-64 w-full min-w-0 sm:h-72">
          {trend.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">Brak danych</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={trend} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#a1a1aa" }} interval="preserveStartEnd" />
                <YAxis width={36} tick={{ fontSize: 10, fill: "#a1a1aa" }} unit="%" domain={[0, 100]} />
                <Tooltip
                  formatter={(value) => [`${value}%`, "% osiągniętych"] as [string, string]}
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="rate" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktywność ustalania celów</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1.5">
          {creationActivity.length === 0 ? (
            <p className="text-sm text-muted">Brak danych o zespole.</p>
          ) : (
            creationActivity.map((row) => (
              <div
                key={row.name}
                className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="min-w-0 truncate text-foreground/90">{row.name}</span>
                <span className={row.count === 0 ? "shrink-0 text-rose-400" : "shrink-0 text-muted"}>
                  {row.count === 0 ? "nie ustalił żadnego celu" : `${row.count} utworzonych celów`}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cele niedowiezione ({notAchievedGoals.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Tablica" className="w-full min-w-0">
              <Select value={boardFilter} onChange={(event) => setBoardFilter(event.target.value)}>
                <option value="all">Wszystkie</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Poziom" className="w-full min-w-0">
              <Select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
                <option value="all">Wszystkie</option>
                {GOAL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {GOAL_LEVEL_LABELS[level]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Okres" className="w-full min-w-0">
              <Select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>
                <option value="all">Wszystkie</option>
                {GOAL_PERIOD_TYPES.map((period) => (
                  <option key={period} value={period}>
                    {GOAL_PERIOD_TYPE_LABELS[period]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Właściciel" className="w-full min-w-0">
              <Select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                <option value="all">Wszyscy</option>
                {teamProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {getUserDisplayName(profile)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {notAchievedGoals.length === 0 ? (
            <p className="text-sm text-muted">Brak niedowiezionych celów dla wybranych filtrów.</p>
          ) : (
            notAchievedGoals.map((goal) => {
              const board = boardsById.get(goal.boardId);
              const kind = board ? kindsByCode.get(board.kind) : undefined;
              return (
                <Link
                  key={goal.id}
                  href={`/tablice-celow/${goal.boardId}/${goal.id}`}
                  className="rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm transition hover:border-accent/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{goal.name}</p>
                    <Badge tone="critical">{GOAL_SETTLEMENT_STATUS_LABELS.not_achieved}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {nameByProfile.get(goal.ownerId ?? "") ?? "Brak właściciela"} · {board?.name ?? "—"}
                    {kind ? ` (${kind.label})` : ""} · rozliczono {goal.settledAt ? formatDate(goal.settledAt) : "—"}
                  </p>
                  {goal.settlementWhatFailed ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted/90">
                      Co się nie udało: {goal.settlementWhatFailed}
                    </p>
                  ) : null}
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wnioski z rozliczeń (ostatnie {conclusions.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {conclusions.length === 0 ? (
            <p className="text-sm text-muted">Brak zapisanych wniosków.</p>
          ) : (
            conclusions.map((goal) => {
              const board = boardsById.get(goal.boardId);
              return (
                <div key={goal.id} className="rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm">
                  <p className="text-xs text-muted">
                    {goal.name} · {board?.name ?? "—"} ·{" "}
                    {goal.settledAt ? formatDate(goal.settledAt) : "—"}
                  </p>
                  <p className="mt-1 text-foreground/90">{goal.settlementConclusions}</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
