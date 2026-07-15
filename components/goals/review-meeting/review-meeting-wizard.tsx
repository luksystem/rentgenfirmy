"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { getUserDisplayName } from "@/lib/auth/types";
import {
  GOAL_PRIORITY_LABELS,
  GOAL_STATUS_LABELS,
  type Goal,
} from "@/lib/goals/types";
import {
  REVIEW_MEETING_PRESET_MINUTES,
  REVIEW_MEETING_SUMMARY_BUFFER_SECONDS,
  allocateReviewMeetingSlots,
  formatTimerSeconds,
  isActiveGoalForReview,
  sortGoalsForReviewMeeting,
} from "@/lib/goals/review-meeting-timing";
import { fetchGoalParticipantsBatch } from "@/lib/supabase/goal-repository";
import {
  createGoalReviewMeeting,
  startGoalReviewMeeting,
} from "@/lib/supabase/goal-review-meeting-repository";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore, EMPTY_GOALS } from "@/store/goal-store";
import { useGoalReviewMeetingStore } from "@/store/goal-review-meeting-store";

const STEPS = ["Tablica", "Uczestnicy", "Czas i deep-dive", "Rozkład czasu"] as const;

export function ReviewMeetingWizard({ initialBoardId }: { initialBoardId?: string }) {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const boards = useGoalStore((s) => s.boards);
  const teamProfiles = useGoalStore((s) => s.teamProfiles);
  const hydrate = useGoalStore((s) => s.hydrate);
  const ensureBoardGoals = useGoalStore((s) => s.ensureBoardGoals);
  const goalsByBoard = useGoalStore((s) => s.goalsByBoard);
  const setActiveMeeting = useGoalReviewMeetingStore((s) => s.setActiveMeeting);

  const [step, setStep] = useState(0);
  const [boardId, setBoardId] = useState(initialBoardId ?? "");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [plannedMinutes, setPlannedMinutes] = useState(60);
  const [customMinutes, setCustomMinutes] = useState("");
  const [deepDiveIds, setDeepDiveIds] = useState<Set<string>>(new Set());
  const [suggestedParticipantsReady, setSuggestedParticipantsReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (initialBoardId) setBoardId(initialBoardId);
  }, [initialBoardId]);

  useEffect(() => {
    if (!boardId) return;
    void ensureBoardGoals(boardId);
  }, [boardId, ensureBoardGoals]);

  const boardGoals = goalsByBoard[boardId] ?? EMPTY_GOALS;
  const activeGoals = useMemo(
    () => sortGoalsForReviewMeeting(boardGoals.filter(isActiveGoalForReview)),
    [boardGoals],
  );

  useEffect(() => {
    if (!boardId || activeGoals.length === 0) {
      setSuggestedParticipantsReady(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const participantsByGoal = await fetchGoalParticipantsBatch(activeGoals.map((g) => g.id));
        const ids = new Set<string>();
        for (const goal of activeGoals) {
          if (goal.ownerId) ids.add(goal.ownerId);
          for (const p of participantsByGoal[goal.id] ?? []) {
            ids.add(p.profileId);
          }
        }
        if (profile?.id) ids.add(profile.id);
        if (!cancelled) {
          setParticipantIds([...ids]);
          setSuggestedParticipantsReady(true);
        }
      } catch {
        if (!cancelled) {
          const fallback = new Set<string>();
          for (const goal of activeGoals) {
            if (goal.ownerId) fallback.add(goal.ownerId);
          }
          if (profile?.id) fallback.add(profile.id);
          setParticipantIds([...fallback]);
          setSuggestedParticipantsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId, activeGoals, profile?.id]);

  const effectiveMinutes = (() => {
    if (!customMinutes.trim()) return plannedMinutes;
    const parsed = Number(customMinutes);
    if (!Number.isFinite(parsed)) return plannedMinutes;
    return Math.max(15, parsed);
  })();

  const allocation = useMemo(() => {
    return allocateReviewMeetingSlots({
      totalMinutes: effectiveMinutes,
      goals: activeGoals.map((goal) => ({
        goalId: goal.id,
        deepDive: deepDiveIds.has(goal.id),
      })),
      summaryBufferSeconds: REVIEW_MEETING_SUMMARY_BUFFER_SECONDS,
    });
  }, [activeGoals, deepDiveIds, effectiveMinutes]);

  const goalById = useMemo(() => {
    const map = new Map<string, Goal>();
    for (const goal of activeGoals) map.set(goal.id, goal);
    return map;
  }, [activeGoals]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleDeepDive(goalId: string) {
    setDeepDiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  }

  async function handleStart() {
    if (!boardId || allocation.slots.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const draft = await createGoalReviewMeeting({
        boardId,
        facilitatorId: profile?.id ?? null,
        plannedMinutes: effectiveMinutes,
        summaryBufferSeconds: REVIEW_MEETING_SUMMARY_BUFFER_SECONDS,
        participantIds,
        items: allocation.slots.map((slot, index) => ({
          goalId: slot.goalId,
          sortOrder: index,
          plannedSeconds: slot.plannedSeconds,
          deepDive: slot.deepDive,
        })),
      });
      const started = await startGoalReviewMeeting(draft.id);
      setActiveMeeting(started);
      router.push(`/tablice-celow/przeglad/${started.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się uruchomić spotkania.");
    } finally {
      setSaving(false);
    }
  }

  const canNext =
    (step === 0 && Boolean(boardId)) ||
    (step === 1 && participantIds.length > 0) ||
    (step === 2 && activeGoals.length > 0 && effectiveMinutes >= 15) ||
    (step === 3 && allocation.slots.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              index === step
                ? "bg-accent/15 text-accent"
                : index < step
                  ? "bg-surface-muted text-foreground"
                  : "bg-surface-muted/50 text-muted",
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {step === 0 ? (
        <Field label="Tablica celów">
          <Select value={boardId} onChange={(e) => setBoardId(e.target.value)}>
            <option value="">Wybierz tablicę…</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Propozycja na podstawie właścicieli i uczestników celów na tablicy
            {suggestedParticipantsReady ? "" : " (ładowanie…)"}.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {teamProfiles.map((member) => {
              const checked = participantIds.includes(member.id);
              return (
                <label
                  key={member.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                    checked ? "border-accent/50 bg-accent/5" : "border-border bg-surface-muted/30",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleParticipant(member.id)}
                  />
                  {getUserDisplayName(member)}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Długość spotkania</p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_MEETING_PRESET_MINUTES.map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  size="sm"
                  variant={!customMinutes && plannedMinutes === minutes ? "default" : "outline"}
                  onClick={() => {
                    setPlannedMinutes(minutes);
                    setCustomMinutes("");
                  }}
                >
                  {minutes} min
                </Button>
              ))}
            </div>
            <div className="mt-3 max-w-[160px]">
              <Field label="Własny czas (min)">
                <Input
                  type="number"
                  min={15}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="np. 75"
                  onBlur={() => {
                    if (customMinutes.trim() === "") return;
                    const parsed = Number(customMinutes);
                    if (!Number.isFinite(parsed)) {
                      setCustomMinutes("");
                      return;
                    }
                    setCustomMinutes(String(Math.max(15, parsed)));
                  }}
                />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">
              Cele do głębszego omówienia (2× czas)
            </p>
            {activeGoals.length === 0 ? (
              <p className="text-sm text-muted">Brak aktywnych celów na tej tablicy.</p>
            ) : (
              <div className="space-y-2">
                {activeGoals.map((goal) => (
                  <label
                    key={goal.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2",
                      deepDiveIds.has(goal.id)
                        ? "border-accent/50 bg-accent/5"
                        : "border-border bg-surface-muted/20",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={deepDiveIds.has(goal.id)}
                      onChange={() => toggleDeepDive(goal.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{goal.name}</span>
                      <span className="text-xs text-muted">
                        {GOAL_STATUS_LABELS[goal.status]} · {goal.progressPercent}% ·{" "}
                        {GOAL_PRIORITY_LABELS[goal.priority]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-[160px]">
              <Field label="Całkowity czas (min)">
                <Input
                  type="number"
                  min={15}
                  value={customMinutes}
                  placeholder={String(plannedMinutes)}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  onFocus={() => {
                    if (customMinutes === "") setCustomMinutes(String(plannedMinutes));
                  }}
                  onBlur={() => {
                    if (customMinutes.trim() === "") {
                      setCustomMinutes(String(plannedMinutes));
                      return;
                    }
                    const parsed = Number(customMinutes);
                    if (!Number.isFinite(parsed)) {
                      setCustomMinutes(String(plannedMinutes));
                      return;
                    }
                    setCustomMinutes(String(Math.max(15, parsed)));
                  }}
                />
              </Field>
            </div>
            <p className="pb-2 text-sm text-muted">
              Bufor podsumowania: {formatTimerSeconds(REVIEW_MEETING_SUMMARY_BUFFER_SECONDS)}
            </p>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {allocation.slots.map((slot, index) => {
              const goal = goalById.get(slot.goalId);
              return (
                <li key={slot.goalId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="text-muted">{index + 1}. </span>
                    {goal?.name ?? slot.goalId}
                    {slot.deepDive ? (
                      <span className="ml-2 text-xs text-accent">deep-dive</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatTimerSeconds(slot.plannedSeconds)}
                  </span>
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-3 bg-surface-muted/30 px-3 py-2.5 text-sm">
              <span>Podsumowanie spotkania</span>
              <span className="font-medium tabular-nums">
                {formatTimerSeconds(allocation.summaryBufferSeconds)}
              </span>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || saving}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Wstecz
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Dalej
          </Button>
        ) : (
          <Button type="button" disabled={!canNext || saving} onClick={() => void handleStart()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Rozpocznij przegląd
          </Button>
        )}
      </div>
    </div>
  );
}
