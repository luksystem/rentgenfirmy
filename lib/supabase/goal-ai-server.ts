import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToGoalMethodology } from "@/lib/supabase/goal-mappers";
import type { GoalAiReviewContext } from "@/lib/ai/goal-ai-advisor";
import {
  GOAL_STATUS_LABELS,
  GOAL_REVIEW_OUTCOME_LABELS,
  type GoalAiSuggestedStructure,
  type GoalMethodology,
  type GoalStatus,
  type GoalReviewOutcome,
} from "@/lib/goals/types";

export async function fetchActiveGoalMethodologiesAdmin(): Promise<GoalMethodology[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("goal_methodologies")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalMethodology);
}

export async function insertGoalAiSuggestionAdmin(input: {
  goalId?: string | null;
  trigger: "create" | "review" | "manual";
  inputDescription: string;
  suggestedMethodologyCode: string | null;
  justification: string | null;
  alternatives: Array<{ code: string; whenBetter: string }>;
  structure: GoalAiSuggestedStructure;
  ongoingAdjustment?: unknown;
  vagueWarning: string | null;
  createdBy: string | null;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const storedStructure = input.ongoingAdjustment
    ? { ...input.structure, ongoingAdjustment: input.ongoingAdjustment }
    : input.structure;

  const { data, error } = await supabase
    .from("goal_ai_suggestions")
    .insert({
      goal_id: input.goalId ?? null,
      trigger: input.trigger,
      input_description: input.inputDescription,
      suggested_methodology_code: input.suggestedMethodologyCode,
      justification: input.justification,
      alternatives: input.alternatives,
      structure: storedStructure,
      vague_warning: input.vagueWarning,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id as string;
}

/** Kontekst do promptu AI dla trigger='review' — bieżący stan celu i skrócona historia przeglądów. */
export async function fetchGoalReviewContextAdmin(goalId: string): Promise<{
  status: GoalStatus;
  progressPercent: number;
  periodEnd: string;
  reviewContext: GoalAiReviewContext;
} | null> {
  const supabase = getSupabaseAdmin();
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("status, progress_percent, period_end")
    .eq("id", goalId)
    .maybeSingle();

  if (goalError) {
    throw new Error(goalError.message);
  }
  if (!goal) {
    return null;
  }

  const { data: reviews, error: reviewError } = await supabase
    .from("goal_reviews")
    .select("scheduled_at, completed_at, outcome, note")
    .eq("goal_id", goalId)
    .order("scheduled_at", { ascending: false })
    .limit(5);

  if (reviewError) {
    throw new Error(reviewError.message);
  }

  const daysRemaining = Math.ceil(
    (new Date(goal.period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  const recentReviewsSummary = (reviews ?? [])
    .filter((review) => review.completed_at)
    .map((review) => {
      const outcomeLabel = review.outcome
        ? GOAL_REVIEW_OUTCOME_LABELS[review.outcome as GoalReviewOutcome] ?? review.outcome
        : "brak wyniku";
      return `${review.scheduled_at.slice(0, 10)}: ${outcomeLabel}${review.note ? ` — ${review.note}` : ""}`;
    })
    .join("; ");

  return {
    status: goal.status as GoalStatus,
    progressPercent: goal.progress_percent,
    periodEnd: goal.period_end,
    reviewContext: {
      statusLabel: GOAL_STATUS_LABELS[goal.status as GoalStatus] ?? goal.status,
      progressPercent: goal.progress_percent,
      daysRemaining,
      recentReviewsSummary,
    },
  };
}
