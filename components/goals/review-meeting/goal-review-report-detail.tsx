"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveReviewOutcomeLabel } from "@/lib/goals/module-settings";
import { GOAL_DEFERRAL_REASON_LABELS, type GoalDeferral } from "@/lib/goals/types";
import { formatTimerSeconds } from "@/lib/goals/review-meeting-timing";
import { fetchGoalDeferralsByMeeting } from "@/lib/supabase/goal-repository";
import { useGoalReviewMeetingStore } from "@/store/goal-review-meeting-store";
import { useGoalStore, EMPTY_GOALS } from "@/store/goal-store";

const OUTCOME_COLORS = ["#34d399", "#fbbf24", "#f87171", "#60a5fa", "#c084fc", "#fb7185", "#71717a"];

function resolveActualSeconds(meeting: {
  actualDurationSeconds: number | null;
  startedAt: string | null;
  completedAt: string | null;
  items: Array<{ actualSeconds: number | null }>;
}) {
  if (meeting.actualDurationSeconds != null && meeting.actualDurationSeconds > 0) {
    return meeting.actualDurationSeconds;
  }
  const fromItems = meeting.items.reduce((sum, item) => sum + (item.actualSeconds ?? 0), 0);
  if (fromItems > 0) return fromItems;
  if (meeting.startedAt && meeting.completedAt) {
    return Math.max(
      0,
      Math.round(
        (new Date(meeting.completedAt).getTime() - new Date(meeting.startedAt).getTime()) / 1000,
      ),
    );
  }
  return 0;
}

export function GoalReviewReportDetail({ meetingId }: { meetingId: string }) {
  const ensureMeeting = useGoalReviewMeetingStore((s) => s.ensureMeeting);
  const meeting = useGoalReviewMeetingStore((s) => s.activeMeeting);
  const loading = useGoalReviewMeetingStore((s) => s.activeMeetingLoading);
  const error = useGoalReviewMeetingStore((s) => s.activeMeetingError);
  const goalsByBoard = useGoalStore((s) => s.goalsByBoard);
  const ensureBoardGoals = useGoalStore((s) => s.ensureBoardGoals);
  const hydrate = useGoalStore((s) => s.hydrate);
  const reviewOutcomes = useGoalStore((s) => s.moduleSettings.reviewOutcomes);
  const [deferrals, setDeferrals] = useState<GoalDeferral[]>([]);

  useEffect(() => {
    void hydrate();
    void ensureMeeting(meetingId, { force: true });
  }, [meetingId, ensureMeeting, hydrate]);

  useEffect(() => {
    if (meeting?.boardId) void ensureBoardGoals(meeting.boardId);
  }, [meeting?.boardId, ensureBoardGoals]);

  useEffect(() => {
    let cancelled = false;
    void fetchGoalDeferralsByMeeting(meetingId)
      .then((rows) => {
        if (!cancelled) setDeferrals(rows);
      })
      .catch(() => {
        if (!cancelled) setDeferrals([]);
      });
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  const boardGoals = meeting ? goalsByBoard[meeting.boardId] ?? EMPTY_GOALS : EMPTY_GOALS;
  const goalName = (goalId: string) => boardGoals.find((g) => g.id === goalId)?.name ?? goalId;

  const actualSeconds = meeting ? resolveActualSeconds(meeting) : 0;
  const plannedSeconds = meeting ? meeting.plannedMinutes * 60 : 0;

  const outcomeChart = useMemo(() => {
    if (!meeting) return [];
    const counts: Record<string, number> = { none: 0 };
    for (const item of meeting.items) {
      if (item.outcome) {
        counts[item.outcome] = (counts[item.outcome] ?? 0) + 1;
      } else {
        counts.none! += 1;
      }
    }
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([key, value], index) => ({
        key,
        name:
          key === "none" ? "Bez oceny" : resolveReviewOutcomeLabel(key, reviewOutcomes),
        value,
        color: OUTCOME_COLORS[index % OUTCOME_COLORS.length]!,
      }));
  }, [meeting, reviewOutcomes]);

  const durationChart = useMemo(() => {
    if (!meeting) return [];
    return [
      { name: "Plan", seconds: plannedSeconds, minutes: Math.round(plannedSeconds / 60) },
      { name: "Rzeczywisty", seconds: actualSeconds, minutes: Math.round(actualSeconds / 60) },
    ];
  }, [meeting, plannedSeconds, actualSeconds]);

  const onPlanRate = useMemo(() => {
    if (!meeting || meeting.items.length === 0) return 0;
    const positiveId = reviewOutcomes[0]?.id ?? "on_track";
    const onTrack = meeting.items.filter((item) => item.outcome === positiveId).length;
    return Math.round((onTrack / meeting.items.length) * 100);
  }, [meeting, reviewOutcomes]);

  if (loading && !meeting) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie raportu…
      </div>
    );
  }

  if (error || !meeting) {
    return <p className="text-sm text-rose-400">{error ?? "Raport nie istnieje."}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/tablice-celow/raporty"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do listy raportów
      </Link>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {meeting.boardName ?? "Przegląd celów"}
        </h2>
        <p className="text-sm text-muted">
          {meeting.completedAt
            ? new Date(meeting.completedAt).toLocaleString("pl-PL")
            : "Nieukończone"}{" "}
          · plan {meeting.plannedMinutes} min · rzeczywisty {formatTimerSeconds(actualSeconds)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Czas trwania</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatTimerSeconds(actualSeconds)}
            </p>
            <p className="text-xs text-muted">plan {meeting.plannedMinutes} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Według planu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{onPlanRate}%</p>
            <p className="text-xs text-muted">celów on track</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Zadania</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{meeting.actions.length}</p>
            <p className="text-xs text-muted">utworzone na spotkaniu</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Czas: plan vs rzeczywistość</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={durationChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} unit=" min" />
                <Tooltip
                  formatter={(value) => [`${value} min`, "Czas"] as [string, string]}
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="minutes" fill="#60a5fa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skuteczność / według planu</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {outcomeChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Brak ocen
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={outcomeChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {outcomeChart.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <ul className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
              {outcomeChart.map((entry) => (
                <li key={entry.key} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: entry.color }}
                  />
                  {entry.name}: {entry.value}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {meeting.aiSummary ? (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-base text-accent">Podsumowanie AI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{meeting.aiSummary}</div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted">Brak podsumowania AI dla tego spotkania.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Omówione cele</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {meeting.items.map((item) => (
              <li key={item.id} className="rounded-xl border border-border/60 bg-surface-muted/20 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{goalName(item.goalId)}</p>
                  <span className="text-xs tabular-nums text-muted">
                    {item.actualSeconds != null
                      ? formatTimerSeconds(item.actualSeconds)
                      : "—"}
                  </span>
                </div>
                {item.outcome ? (
                  <p className="text-xs text-muted">
                    {resolveReviewOutcomeLabel(item.outcome, reviewOutcomes)}
                  </p>
                ) : null}
                {item.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-muted">{item.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {meeting.actions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zadania ze spotkania</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {meeting.actions.map((action) => (
                <li key={action.id}>
                  {action.title}
                  <span className="text-muted"> — {goalName(action.goalId)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {deferrals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Przełożenia / niedowiezienia</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {deferrals.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2"
                >
                  <p className="font-medium">{goalName(entry.goalId)}</p>
                  <p className="text-xs text-amber-200">
                    {GOAL_DEFERRAL_REASON_LABELS[entry.reason]}
                    {entry.markedUndelivered ? " · niedowieziony" : ""}
                  </p>
                  <p className="text-xs text-muted">
                    Okres {entry.previousPeriodStart}–{entry.previousPeriodEnd} →{" "}
                    {entry.newPeriodStart}–{entry.newPeriodEnd}
                  </p>
                  {entry.note ? <p className="mt-1 text-muted">{entry.note}</p> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
