"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  GOAL_REVIEW_OUTCOME_LABELS,
  type Goal,
  type GoalReviewMeetingWithDetails,
  type GoalReviewOutcome,
  type GoalStatus,
} from "@/lib/goals/types";
import {
  REVIEW_MEETING_EXTRA_SECONDS,
  canTakeExtraTime,
  formatTimerSeconds,
  redistributeUnusedSeconds,
  takeExtraTime,
} from "@/lib/goals/review-meeting-timing";
import {
  closeGoalReview,
  scheduleGoalReview,
  updateGoalProgress,
} from "@/lib/supabase/goal-repository";
import {
  completeMeetingItem,
  updateMeetingItemFields,
  updateMeetingItemNotes,
  updateMeetingSummaryBuffer,
  activateMeetingItem,
} from "@/lib/supabase/goal-review-meeting-repository";
import { ReviewMeetingGoalPanel } from "@/components/goals/review-meeting/review-meeting-goal-panel";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore, EMPTY_GOALS } from "@/store/goal-store";
import { useGoalReviewMeetingStore } from "@/store/goal-review-meeting-store";

export function ReviewMeetingSession({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const teamProfiles = useGoalStore((s) => s.teamProfiles);
  const goalsByBoard = useGoalStore((s) => s.goalsByBoard);
  const ensureBoardGoals = useGoalStore((s) => s.ensureBoardGoals);
  const hydrate = useGoalStore((s) => s.hydrate);

  const ensureMeeting = useGoalReviewMeetingStore((s) => s.ensureMeeting);
  const setActiveMeeting = useGoalReviewMeetingStore((s) => s.setActiveMeeting);
  const meeting = useGoalReviewMeetingStore((s) => s.activeMeeting);
  const loading = useGoalReviewMeetingStore((s) => s.activeMeetingLoading);
  const error = useGoalReviewMeetingStore((s) => s.activeMeetingError);

  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<GoalReviewOutcome | null>(null);
  const [goalStatus, setGoalStatus] = useState<GoalStatus>("in_progress");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [summaryBuffer, setSummaryBuffer] = useState(600);
  const [timeUpOpen, setTimeUpOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const remainingRef = useRef(0);
  const notesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    void hydrate();
    void ensureMeeting(meetingId, { force: true });
  }, [meetingId, ensureMeeting, hydrate]);

  useEffect(() => {
    if (meeting?.boardId) {
      void ensureBoardGoals(meeting.boardId);
    }
  }, [meeting?.boardId, ensureBoardGoals]);

  const activeItem = useMemo(() => {
    if (!meeting) return null;
    return (
      meeting.items.find((item) => item.status === "active") ??
      meeting.items.find((item) => item.status === "pending") ??
      null
    );
  }, [meeting]);

  const boardGoals = meeting ? goalsByBoard[meeting.boardId] ?? EMPTY_GOALS : EMPTY_GOALS;
  const goalById = useMemo(() => {
    const map = new Map<string, Goal>();
    for (const goal of boardGoals) map.set(goal.id, goal);
    return map;
  }, [boardGoals]);

  const activeGoal = activeItem ? goalById.get(activeItem.goalId) ?? null : null;

  const ownerName = useMemo(() => {
    if (!activeGoal?.ownerId) return "Brak właściciela";
    const member = teamProfiles.find((p) => p.id === activeGoal.ownerId);
    return member ? getUserDisplayName(member) : "Nieznany";
  }, [activeGoal?.ownerId, teamProfiles]);

  // Sync local state when active item changes
  useEffect(() => {
    if (!activeItem || !activeGoal) return;
    setNotes(activeItem.notes ?? "");
    setOutcome(activeItem.outcome);
    setGoalStatus(activeGoal.status);
    const startRemaining = activeItem.remainingSeconds ?? activeItem.plannedSeconds;
    setRemainingSeconds(startRemaining);
    remainingRef.current = startRemaining;
    elapsedRef.current = 0;
    setSummaryBuffer(meeting?.summaryBufferSeconds ?? 600);
    setTimeUpOpen(false);

    if (activeItem.status === "pending") {
      void activateMeetingItem(activeItem.id, startRemaining).then((updated) => {
        if (!meeting) return;
        setActiveMeeting({
          ...meeting,
          items: meeting.items.map((item) => (item.id === updated.id ? updated : item)),
        });
      });
    }
  }, [activeItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer
  useEffect(() => {
    if (!activeItem || activeItem.status === "done") return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        remainingRef.current = next;
        elapsedRef.current += 1;
        if (next === 0) {
          setTimeUpOpen(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeItem?.id, activeItem?.status]);

  const persistNotes = useCallback(
    (value: string) => {
      setNotes(value);
      if (!activeItem) return;
      if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
      notesSaveTimer.current = setTimeout(() => {
        void updateMeetingItemNotes(activeItem.id, value);
      }, 600);
    },
    [activeItem],
  );

  async function refreshMeeting(): Promise<GoalReviewMeetingWithDetails | null> {
    const next = await ensureMeeting(meetingId, { force: true });
    return next;
  }

  async function finishCurrentItemAndAdvance(options?: { skipOutcomeCheck?: boolean }) {
    if (!meeting || !activeItem || !activeGoal) return;
    if (!outcome) {
      setLocalError("Wybierz wynik przeglądu względem kryteriów sukcesu.");
      return;
    }
    if (!notes.trim() && !options?.skipOutcomeCheck) {
      setLocalError("Dodaj krótkie uzasadnienie oceny w notatkach.");
      return;
    }

    setAdvancing(true);
    setLocalError(null);
    setTimeUpOpen(false);

    try {
      const actualSeconds = Math.max(1, elapsedRef.current);
      const unusedSeconds = Math.max(0, remainingRef.current);

      if (goalStatus !== activeGoal.status) {
        await updateGoalProgress(activeGoal.id, {
          status: goalStatus,
          progressPercent: activeGoal.progressPercent,
          authorId: profile?.id ?? null,
          note: `Zmiana statusu podczas przeglądu: ${GOAL_REVIEW_OUTCOME_LABELS[outcome]}`,
        });
      }

      // Close / create goal_review record
      const scheduled = await scheduleGoalReview({
        goalId: activeGoal.id,
        scheduledAt: new Date().toISOString(),
        requiresAction: false,
        note: notes.trim() || undefined,
      });
      const closed = await closeGoalReview({
        id: scheduled.id,
        closedBy: profile?.id ?? null,
        outcome,
        progressSnapshot: activeGoal.progressPercent,
        note: notes.trim() || undefined,
      });

      await completeMeetingItem({
        itemId: activeItem.id,
        outcome,
        notes,
        actualSeconds,
        goalReviewId: closed.id,
      });

      // Redistribute unused time to remaining pending items
      const remainingItems = meeting.items.filter(
        (item) =>
          item.id !== activeItem.id &&
          (item.status === "pending" || item.status === "active"),
      );

      if (unusedSeconds > 0 && remainingItems.length > 0) {
        const redistributed = redistributeUnusedSeconds({
          unusedSeconds,
          remainingSlots: remainingItems.map((item) => ({
            goalId: item.goalId,
            plannedSeconds: item.remainingSeconds ?? item.plannedSeconds,
            deepDive: item.deepDive,
          })),
        });
        await Promise.all(
          redistributed.map(async (slot) => {
            const item = remainingItems.find((entry) => entry.goalId === slot.goalId);
            if (!item) return;
            await updateMeetingItemFields(item.id, {
              plannedSeconds: slot.plannedSeconds,
              remainingSeconds: slot.plannedSeconds,
            });
          }),
        );
      }

      const nextMeeting = await refreshMeeting();
      if (!nextMeeting) return;

      const nextPending = nextMeeting.items.find(
        (item) => item.status === "pending" || item.status === "active",
      );

      if (!nextPending) {
        router.push(`/tablice-celow/przeglad/${meetingId}/podsumowanie`);
        return;
      }

      if (nextPending.status !== "active") {
        await activateMeetingItem(
          nextPending.id,
          nextPending.remainingSeconds ?? nextPending.plannedSeconds,
        );
        await refreshMeeting();
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Nie udało się przejść dalej.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleExtraThirty() {
    if (!meeting || !activeItem) return;
    const result = takeExtraTime(summaryBuffer, REVIEW_MEETING_EXTRA_SECONDS);
    if (!result.ok) return;

    setSummaryBuffer(result.nextBufferSeconds);
    setRemainingSeconds((prev) => prev + result.grantedSeconds);
    remainingRef.current += result.grantedSeconds;
    setTimeUpOpen(false);

    await updateMeetingSummaryBuffer(meeting.id, result.nextBufferSeconds);
    await updateMeetingItemFields(activeItem.id, {
      remainingSeconds: remainingRef.current,
    });
    setActiveMeeting({
      ...meeting,
      summaryBufferSeconds: result.nextBufferSeconds,
    });
  }

  if (loading && !meeting) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie sesji przeglądu…
      </div>
    );
  }

  if (error || !meeting) {
    return <p className="text-sm text-rose-400">{error ?? "Spotkanie nie istnieje."}</p>;
  }

  if (meeting.status === "completed") {
    return (
      <div className="space-y-3 py-8 text-center">
        <p className="text-sm text-muted">To spotkanie zostało już zakończone.</p>
        <Button type="button" onClick={() => router.push(`/tablice-celow/raporty/${meeting.id}`)}>
          Otwórz raport
        </Button>
      </div>
    );
  }

  if (!activeItem || !activeGoal) {
    return (
      <div className="space-y-3 py-8 text-center">
        <p className="text-sm text-muted">Wszystkie cele omówione — przejdź do podsumowania.</p>
        <Button
          type="button"
          onClick={() => router.push(`/tablice-celow/przeglad/${meetingId}/podsumowanie`)}
        >
          Podsumowanie SI
        </Button>
      </div>
    );
  }

  const doneCount = meeting.items.filter((item) => item.status === "done").length;
  const totalCount = meeting.items.length;
  const extraAvailable = canTakeExtraTime(summaryBuffer);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="sticky top-0 z-10 -mx-1 space-y-3 rounded-2xl border border-border bg-background/95 px-4 py-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              Cel {doneCount + 1} / {totalCount}
              {activeItem.deepDive ? " · deep-dive" : ""}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{activeGoal.name}</h2>
          </div>
          <div className="text-right">
            <p
              className={`font-mono text-3xl font-semibold tabular-nums ${
                remainingSeconds <= 30 ? "text-rose-400" : "text-foreground"
              }`}
            >
              {formatTimerSeconds(remainingSeconds)}
            </p>
            <p className="text-xs text-muted">
              Bufor podsumowania: {formatTimerSeconds(summaryBuffer)}
            </p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full bg-accent transition-[width] duration-1000"
            style={{
              width: `${Math.min(
                100,
                ((activeItem.plannedSeconds - remainingSeconds) / Math.max(1, activeItem.plannedSeconds)) *
                  100,
              )}%`,
            }}
          />
        </div>
      </div>

      {localError ? <p className="text-sm text-rose-400">{localError}</p> : null}

      <ReviewMeetingGoalPanel
        meetingId={meeting.id}
        item={activeItem}
        goal={activeGoal}
        ownerName={ownerName}
        currentProfileId={profile?.id ?? null}
        notes={notes}
        onNotesChange={persistNotes}
        outcome={outcome}
        onOutcomeChange={setOutcome}
        goalStatus={goalStatus}
        onGoalStatusChange={setGoalStatus}
        onTaskCreated={() => void refreshMeeting()}
      />

      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
        <p className="text-xs text-muted self-center">
          Wcześniejsze „Dalej” zwraca niewykorzystany czas do pozostałych celów.
        </p>
        <Button
          type="button"
          disabled={advancing || !outcome}
          onClick={() => void finishCurrentItemAndAdvance()}
        >
          {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Dalej
        </Button>
      </div>

      <Dialog open={timeUpOpen} onOpenChange={setTimeUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Czas na ten cel minął</DialogTitle>
            <DialogDescription>
              Przejdź do kolejnego celu albo weź 30 sekund z bufora podsumowania.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={advancing || !outcome}
              onClick={() => void finishCurrentItemAndAdvance()}
            >
              Dalej
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!extraAvailable || advancing}
              onClick={() => void handleExtraThirty()}
            >
              +{REVIEW_MEETING_EXTRA_SECONDS} sekund
              {!extraAvailable ? " (brak bufora)" : ""}
            </Button>
          </div>
          {!outcome ? (
            <p className="text-sm text-amber-400">Najpierw wybierz wynik przeglądu.</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
