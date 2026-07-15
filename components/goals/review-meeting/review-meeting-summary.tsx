"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GOAL_REVIEW_OUTCOME_LABELS, type GoalReviewOutcome } from "@/lib/goals/types";
import { useGoalReviewMeetingStore } from "@/store/goal-review-meeting-store";
import { useGoalStore, EMPTY_GOALS } from "@/store/goal-store";

export function ReviewMeetingSummary({ meetingId }: { meetingId: string }) {
  const ensureMeeting = useGoalReviewMeetingStore((s) => s.ensureMeeting);
  const invalidateReports = useGoalReviewMeetingStore((s) => s.invalidateReports);
  const meeting = useGoalReviewMeetingStore((s) => s.activeMeeting);
  const loading = useGoalReviewMeetingStore((s) => s.activeMeetingLoading);
  const goalsByBoard = useGoalStore((s) => s.goalsByBoard);
  const ensureBoardGoals = useGoalStore((s) => s.ensureBoardGoals);

  const [summary, setSummary] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ensureMeeting(meetingId, { force: true });
  }, [meetingId, ensureMeeting]);

  useEffect(() => {
    if (meeting?.boardId) void ensureBoardGoals(meeting.boardId);
  }, [meeting?.boardId, ensureBoardGoals]);

  useEffect(() => {
    if (meeting?.aiSummary) {
      setSummary(meeting.aiSummary);
    }
  }, [meeting?.aiSummary]);

  const boardGoals = meeting ? goalsByBoard[meeting.boardId] ?? EMPTY_GOALS : EMPTY_GOALS;
  const goalName = (goalId: string) => boardGoals.find((g) => g.id === goalId)?.name ?? goalId;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/goals/ai/meeting-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      const payload = (await response.json()) as { summary?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się wygenerować podsumowania.");
      }
      setSummary(payload.summary ?? "");
      invalidateReports();
      await ensureMeeting(meetingId, { force: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd generowania podsumowania.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading && !meeting) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie…
      </div>
    );
  }

  if (!meeting) {
    return <p className="text-sm text-rose-400">Spotkanie nie istnieje.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-border p-4">
        <p className="mb-2 text-sm font-medium">Omówione cele</p>
        <ul className="space-y-2 text-sm">
          {meeting.items.map((item) => (
            <li key={item.id} className="rounded-lg bg-surface-muted/30 px-3 py-2">
              <span className="font-medium">{goalName(item.goalId)}</span>
              {item.outcome ? (
                <span className="text-muted">
                  {" "}
                  · {GOAL_REVIEW_OUTCOME_LABELS[item.outcome as GoalReviewOutcome]}
                </span>
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
          <p className="mb-2 text-sm font-medium">Zadania ze spotkania</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {meeting.actions.map((action) => (
              <li key={action.id}>
                {action.title}
                <span className="text-muted"> ({goalName(action.goalId)})</span>
                {action.kanbanTaskId ? (
                  <span className="ml-1 text-xs text-accent">+ Kanban</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {!summary ? (
        <Button type="button" disabled={generating} onClick={() => void handleGenerate()}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Wygeneruj podsumowanie SI i zapisz raport
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p className="mb-2 text-sm font-semibold text-accent">Podsumowanie SI</p>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
              {summary}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href={`/tablice-celow/raporty/${meetingId}`}>Otwórz w Raportach</Link>
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/tablice-celow/raporty">Lista raportów</Link>
            </Button>
            {!meeting.aiSummary ? (
              <Button type="button" disabled={generating} onClick={() => void handleGenerate()}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Zapisz ponownie
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
