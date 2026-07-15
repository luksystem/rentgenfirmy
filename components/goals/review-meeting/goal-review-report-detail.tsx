"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GOAL_REVIEW_OUTCOME_LABELS, type GoalReviewOutcome } from "@/lib/goals/types";
import { useGoalReviewMeetingStore } from "@/store/goal-review-meeting-store";
import { useGoalStore, EMPTY_GOALS } from "@/store/goal-store";

export function GoalReviewReportDetail({ meetingId }: { meetingId: string }) {
  const ensureMeeting = useGoalReviewMeetingStore((s) => s.ensureMeeting);
  const meeting = useGoalReviewMeetingStore((s) => s.activeMeeting);
  const loading = useGoalReviewMeetingStore((s) => s.activeMeetingLoading);
  const error = useGoalReviewMeetingStore((s) => s.activeMeetingError);
  const goalsByBoard = useGoalStore((s) => s.goalsByBoard);
  const ensureBoardGoals = useGoalStore((s) => s.ensureBoardGoals);
  const hydrate = useGoalStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    void ensureMeeting(meetingId, { force: true });
  }, [meetingId, ensureMeeting, hydrate]);

  useEffect(() => {
    if (meeting?.boardId) void ensureBoardGoals(meeting.boardId);
  }, [meeting?.boardId, ensureBoardGoals]);

  const boardGoals = meeting ? goalsByBoard[meeting.boardId] ?? EMPTY_GOALS : EMPTY_GOALS;
  const goalName = (goalId: string) => boardGoals.find((g) => g.id === goalId)?.name ?? goalId;

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
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/tablice-celow/raporty"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do listy raportów
      </Link>

      <div>
        <h2 className="text-lg font-semibold">{meeting.boardName ?? "Przegląd celów"}</h2>
        <p className="text-sm text-muted">
          {meeting.completedAt
            ? new Date(meeting.completedAt).toLocaleString("pl-PL")
            : "Nieukończone"}{" "}
          · {meeting.plannedMinutes} min
        </p>
      </div>

      {meeting.aiSummary ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="mb-2 text-sm font-semibold text-accent">Podsumowanie SI</p>
          <div className="whitespace-pre-wrap text-sm">{meeting.aiSummary}</div>
        </div>
      ) : (
        <p className="text-sm text-muted">Brak podsumowania SI dla tego spotkania.</p>
      )}

      <div className="rounded-xl border border-border p-4">
        <p className="mb-2 text-sm font-medium">Cele</p>
        <ul className="space-y-3 text-sm">
          {meeting.items.map((item) => (
            <li key={item.id} className="rounded-lg bg-surface-muted/30 px-3 py-2">
              <p className="font-medium">{goalName(item.goalId)}</p>
              {item.outcome ? (
                <p className="text-xs text-muted">
                  {GOAL_REVIEW_OUTCOME_LABELS[item.outcome as GoalReviewOutcome]}
                </p>
              ) : null}
              {item.notes ? (
                <p className="mt-1 whitespace-pre-wrap text-muted">{item.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {meeting.actions.length > 0 ? (
        <div className="rounded-xl border border-border p-4">
          <p className="mb-2 text-sm font-medium">Zadania</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {meeting.actions.map((action) => (
              <li key={action.id}>
                {action.title}
                <span className="text-muted"> — {goalName(action.goalId)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
