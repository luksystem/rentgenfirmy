import { getSupabase } from "@/lib/supabase/client";
import { goalToInsertRow, rowToGoal } from "@/lib/supabase/goal-mappers";
import {
  PDCA_IMPROVEMENT_BOARD_KIND,
  PDCA_IMPROVEMENT_METHODOLOGY_CODE,
  type Goal,
  type GoalProblem,
  type GoalProblemInput,
  type GoalProblemStatus,
} from "@/lib/goals/types";

type GoalProblemRow = {
  id: string;
  board_id: string;
  reported_by: string | null;
  title: string;
  description: string;
  status: GoalProblemStatus;
  rejection_reason: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resulting_goal_id: string | null;
  created_at: string;
  updated_at: string;
};

function rowToGoalProblem(row: GoalProblemRow): GoalProblem {
  return {
    id: row.id,
    boardId: row.board_id,
    reportedBy: row.reported_by,
    title: row.title,
    description: row.description,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    resultingGoalId: row.resulting_goal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const IMPROVEMENT_BOARD_NAME = "Usprawnienia (PDCA)";

/** Jedna, wspólna tablica na wszystkie usprawnienia PDCA — tworzona przy pierwszym zgłoszeniu. */
export async function ensureImprovementBoard(): Promise<string> {
  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("goal_boards")
    .select("id")
    .eq("kind", PDCA_IMPROVEMENT_BOARD_KIND)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingError) {
    throw new Error(existingError.message);
  }
  if (existing) {
    return existing.id as string;
  }

  const { data: created, error: createError } = await supabase
    .from("goal_boards")
    .insert({
      kind: PDCA_IMPROVEMENT_BOARD_KIND,
      name: IMPROVEMENT_BOARD_NAME,
      description: "Problemy zgłoszone przez zespół i ich rozwiązania.",
    })
    .select("id")
    .single();
  if (createError) {
    throw new Error(createError.message);
  }
  return created.id as string;
}

export async function fetchPendingProblems(): Promise<GoalProblem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_problems")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToGoalProblem(row as GoalProblemRow));
}

export async function fetchAllProblems(): Promise<GoalProblem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_problems")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToGoalProblem(row as GoalProblemRow));
}

export async function reportProblem(
  input: GoalProblemInput,
  reportedBy: string,
): Promise<GoalProblem> {
  const boardId = await ensureImprovementBoard();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_problems")
    .insert({
      board_id: boardId,
      reported_by: reportedBy,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return rowToGoalProblem(data as GoalProblemRow);
}

/**
 * Akceptacja problemu tworzy Cel na tablicy PDCA (metodologia pdca_improvement) i wiąże go
 * z problemem. Pola rozwiązania (negacja problemu, koszt, oszczędność, zaangażowani) manager
 * uzupełnia potem w standardowym edytorze celu — generyczny renderer field_schema obsłuży je
 * bez dodatkowego kodu.
 */
export async function acceptProblem(
  problem: GoalProblem,
  reviewerId: string,
): Promise<{ problem: GoalProblem; goal: Goal }> {
  const supabase = getSupabase();
  const today = new Date();
  const periodEnd = new Date(today);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { data: goalRow, error: goalError } = await supabase
    .from("goals")
    .insert(
      goalToInsertRow({
        boardId: problem.boardId,
        level: "team",
        name: problem.title,
        description: problem.description,
        periodType: "monthly",
        periodStart: today.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
        methodologyId: PDCA_IMPROVEMENT_METHODOLOGY_CODE,
        createdBy: reviewerId,
      }),
    )
    .select("*")
    .single();
  if (goalError) {
    throw new Error(goalError.message);
  }

  const { data: problemRow, error: problemError } = await supabase
    .from("goal_problems")
    .update({
      status: "accepted",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      resulting_goal_id: goalRow.id,
    })
    .eq("id", problem.id)
    .select("*")
    .single();
  if (problemError) {
    throw new Error(problemError.message);
  }

  await supabase.from("goal_links").insert({
    goal_id: goalRow.id,
    linked_type: "problem",
    linked_id: problem.id,
  });

  return { problem: rowToGoalProblem(problemRow as GoalProblemRow), goal: rowToGoal(goalRow) };
}

export async function rejectProblem(
  problemId: string,
  reviewerId: string,
  rejectionReason: string,
): Promise<GoalProblem> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_problems")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason.trim(),
    })
    .eq("id", problemId)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return rowToGoalProblem(data as GoalProblemRow);
}
