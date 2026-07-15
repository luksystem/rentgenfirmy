import {
  GOAL_PRIORITIES,
  type Goal,
  type GoalPriority,
  type GoalStatus,
} from "@/lib/goals/types";

export const REVIEW_MEETING_SUMMARY_BUFFER_SECONDS = 10 * 60;
export const REVIEW_MEETING_EXTRA_SECONDS = 30;
export const REVIEW_MEETING_PRESET_MINUTES = [30, 45, 60, 90] as const;

const PRIORITY_RANK: Record<GoalPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const STATUS_RISK_RANK: Record<GoalStatus, number> = {
  at_risk: 0,
  in_progress: 1,
  planned: 2,
  on_hold: 3,
  settled: 4,
  cancelled: 5,
};

export type ReviewMeetingGoalSlotInput = {
  goalId: string;
  deepDive: boolean;
};

export type ReviewMeetingGoalSlot = {
  goalId: string;
  deepDive: boolean;
  plannedSeconds: number;
  weight: number;
};

export function isActiveGoalForReview(goal: Pick<Goal, "status">): boolean {
  return goal.status !== "settled" && goal.status !== "cancelled";
}

/** Sort: najbardziej zagrożone pierwsze. */
export function sortGoalsForReviewMeeting<T extends Pick<Goal, "id" | "status" | "progressPercent" | "priority" | "periodEnd">>(
  goals: T[],
): T[] {
  return [...goals].sort((a, b) => {
    const statusDiff = STATUS_RISK_RANK[a.status] - STATUS_RISK_RANK[b.status];
    if (statusDiff !== 0) return statusDiff;
    const progressDiff = a.progressPercent - b.progressPercent;
    if (progressDiff !== 0) return progressDiff;
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.periodEnd.localeCompare(b.periodEnd);
  });
}

export function allocateReviewMeetingSlots(input: {
  totalMinutes: number;
  goals: ReviewMeetingGoalSlotInput[];
  summaryBufferSeconds?: number;
}): { slots: ReviewMeetingGoalSlot[]; summaryBufferSeconds: number; poolSeconds: number } {
  const summaryBufferSeconds = input.summaryBufferSeconds ?? REVIEW_MEETING_SUMMARY_BUFFER_SECONDS;
  const totalSeconds = Math.max(0, Math.round(input.totalMinutes * 60));
  const poolSeconds = Math.max(0, totalSeconds - summaryBufferSeconds);

  if (input.goals.length === 0) {
    return { slots: [], summaryBufferSeconds, poolSeconds };
  }

  const weights = input.goals.map((g) => (g.deepDive ? 2 : 1));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Integer allocation with largest remainder method
  const raw = weights.map((w) => (poolSeconds * w) / totalWeight);
  const floors = raw.map((v) => Math.floor(v));
  let remainder = poolSeconds - floors.reduce((sum, v) => sum + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - floors[i]! }))
    .sort((a, b) => b.frac - a.frac);

  const planned = [...floors];
  for (const entry of order) {
    if (remainder <= 0) break;
    planned[entry.i] = (planned[entry.i] ?? 0) + 1;
    remainder -= 1;
  }

  // Ensure each slot has at least 1 second when pool allows
  const slots: ReviewMeetingGoalSlot[] = input.goals.map((goal, i) => ({
    goalId: goal.goalId,
    deepDive: goal.deepDive,
    weight: weights[i]!,
    plannedSeconds: Math.max(1, planned[i] ?? 1),
  }));

  // Re-normalize if min-1 inflated total beyond pool
  const allocated = slots.reduce((sum, s) => sum + s.plannedSeconds, 0);
  if (allocated > poolSeconds && poolSeconds > 0) {
    let overflow = allocated - poolSeconds;
    for (let i = slots.length - 1; i >= 0 && overflow > 0; i -= 1) {
      const slot = slots[i]!;
      const reducible = Math.max(0, slot.plannedSeconds - 1);
      const cut = Math.min(reducible, overflow);
      slot.plannedSeconds -= cut;
      overflow -= cut;
    }
  }

  return { slots, summaryBufferSeconds, poolSeconds };
}

/** Po wcześniejszym „Dalej”: niewykorzystany czas rozdziel proporcjonalnie na pozostałe cele. */
export function redistributeUnusedSeconds(input: {
  unusedSeconds: number;
  remainingSlots: Array<{ goalId: string; plannedSeconds: number; deepDive: boolean }>;
}): Array<{ goalId: string; plannedSeconds: number }> {
  const unused = Math.max(0, Math.floor(input.unusedSeconds));
  if (unused === 0 || input.remainingSlots.length === 0) {
    return input.remainingSlots.map((s) => ({
      goalId: s.goalId,
      plannedSeconds: s.plannedSeconds,
    }));
  }

  const weights = input.remainingSlots.map((s) => (s.deepDive ? 2 : 1));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const raw = weights.map((w) => (unused * w) / totalWeight);
  const floors = raw.map((v) => Math.floor(v));
  let remainder = unused - floors.reduce((sum, v) => sum + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - floors[i]! }))
    .sort((a, b) => b.frac - a.frac);
  const bonus = [...floors];
  for (const entry of order) {
    if (remainder <= 0) break;
    bonus[entry.i] = (bonus[entry.i] ?? 0) + 1;
    remainder -= 1;
  }

  return input.remainingSlots.map((slot, i) => ({
    goalId: slot.goalId,
    plannedSeconds: slot.plannedSeconds + (bonus[i] ?? 0),
  }));
}

export function canTakeExtraTime(summaryBufferSeconds: number, extraSeconds = REVIEW_MEETING_EXTRA_SECONDS) {
  return summaryBufferSeconds >= extraSeconds;
}

export function takeExtraTime(
  summaryBufferSeconds: number,
  extraSeconds = REVIEW_MEETING_EXTRA_SECONDS,
): { ok: boolean; nextBufferSeconds: number; grantedSeconds: number } {
  if (summaryBufferSeconds <= 0) {
    return { ok: false, nextBufferSeconds: 0, grantedSeconds: 0 };
  }
  const granted = Math.min(extraSeconds, summaryBufferSeconds);
  return {
    ok: granted > 0,
    nextBufferSeconds: summaryBufferSeconds - granted,
    grantedSeconds: granted,
  };
}

export function formatTimerSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function priorityLabelRank(priority: GoalPriority): number {
  return PRIORITY_RANK[priority] ?? GOAL_PRIORITIES.length;
}
