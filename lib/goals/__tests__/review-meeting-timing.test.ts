import { describe, expect, it } from "vitest";
import {
  REVIEW_MEETING_SUMMARY_BUFFER_SECONDS,
  allocateReviewMeetingSlots,
  canTakeExtraTime,
  redistributeUnusedSeconds,
  sortGoalsForReviewMeeting,
  takeExtraTime,
} from "@/lib/goals/review-meeting-timing";
import type { Goal } from "@/lib/goals/types";

function stubGoal(partial: Partial<Goal> & Pick<Goal, "id" | "status" | "progressPercent" | "priority" | "periodEnd">): Goal {
  return {
    boardId: "b1",
    level: "team",
    name: partial.id,
    description: "",
    ownerId: null,
    periodType: "monthly",
    periodStart: "2026-01-01",
    methodologyId: null,
    methodologyFields: {},
    isRecurring: false,
    recurrenceParentId: null,
    recurrenceRootId: null,
    parentGoalId: null,
    projectId: null,
    clientId: null,
    processStageId: null,
    processMilestoneId: null,
    settlementStatus: null,
    settlementWhatWorked: null,
    settlementWhatFailed: null,
    settlementConclusions: null,
    settledAt: null,
    settledBy: null,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("review-meeting-timing", () => {
  it("sorts at_risk and low progress first", () => {
    const goals = [
      stubGoal({ id: "a", status: "in_progress", progressPercent: 80, priority: "normal", periodEnd: "2026-06-30" }),
      stubGoal({ id: "b", status: "at_risk", progressPercent: 40, priority: "low", periodEnd: "2026-07-01" }),
      stubGoal({ id: "c", status: "at_risk", progressPercent: 10, priority: "high", periodEnd: "2026-05-01" }),
    ];
    expect(sortGoalsForReviewMeeting(goals).map((g) => g.id)).toEqual(["c", "b", "a"]);
  });

  it("allocates deep-dive goals 2x time and keeps 10 min summary buffer", () => {
    const { slots, summaryBufferSeconds, poolSeconds } = allocateReviewMeetingSlots({
      totalMinutes: 40,
      goals: [
        { goalId: "g1", deepDive: false },
        { goalId: "g2", deepDive: true },
      ],
    });
    expect(summaryBufferSeconds).toBe(REVIEW_MEETING_SUMMARY_BUFFER_SECONDS);
    expect(poolSeconds).toBe(30 * 60);
    expect(slots).toHaveLength(2);
    const normal = slots.find((s) => s.goalId === "g1")!;
    const deep = slots.find((s) => s.goalId === "g2")!;
    expect(deep.plannedSeconds).toBe(normal.plannedSeconds * 2);
    expect(normal.plannedSeconds + deep.plannedSeconds).toBe(poolSeconds);
  });

  it("redistributes unused seconds to remaining slots by weight", () => {
    const result = redistributeUnusedSeconds({
      unusedSeconds: 90,
      remainingSlots: [
        { goalId: "a", plannedSeconds: 100, deepDive: false },
        { goalId: "b", plannedSeconds: 100, deepDive: true },
      ],
    });
    const a = result.find((s) => s.goalId === "a")!;
    const b = result.find((s) => s.goalId === "b")!;
    expect(a.plannedSeconds + b.plannedSeconds).toBe(290);
    expect(b.plannedSeconds - 100).toBe((a.plannedSeconds - 100) * 2);
  });

  it("takes +30s from summary buffer", () => {
    expect(canTakeExtraTime(600)).toBe(true);
    expect(takeExtraTime(600)).toEqual({
      ok: true,
      nextBufferSeconds: 570,
      grantedSeconds: 30,
    });
    expect(canTakeExtraTime(20)).toBe(false);
    expect(takeExtraTime(20).grantedSeconds).toBe(20);
    expect(takeExtraTime(0).ok).toBe(false);
  });
});
