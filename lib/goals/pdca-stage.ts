import type { Goal, GoalStatus } from "@/lib/goals/types";

export type PdcaStage = "plan" | "do" | "check" | "act" | "cancelled";

export const PDCA_STAGE_LABELS: Record<PdcaStage, string> = {
  plan: "Plan",
  do: "Do (wdrożenie)",
  check: "Check (monitoring)",
  act: "Act (domknięte)",
  cancelled: "Odrzucone",
};

const STATUS_TO_STAGE: Record<GoalStatus, PdcaStage> = {
  planned: "plan",
  in_progress: "do",
  at_risk: "do",
  on_hold: "check",
  settled: "act",
  cancelled: "cancelled",
};

/**
 * Etap PDCA nie jest osobnym polem w bazie — wyprowadzamy go z istniejącego statusu celu.
 * "Check" (cotygodniowy monitoring) nie jest osobnym statusem — działa równolegle do
 * planned/in_progress/at_risk przez cykl przeglądów (GoalReviewMeeting). Jeśli cel ma
 * zaplanowany, jeszcze nieukończony przegląd, pokazujemy to jako "check", nawet gdy status
 * to wciąż in_progress/at_risk — inaczej etap Check nigdy by się nie pokazał w UI.
 */
export function derivePdcaStage(
  goal: Pick<Goal, "status">,
  hasOpenReview = false,
): PdcaStage {
  if (hasOpenReview && (goal.status === "in_progress" || goal.status === "at_risk")) {
    return "check";
  }
  return STATUS_TO_STAGE[goal.status];
}
