import { getSupabase } from "@/lib/supabase/client";
import { rowToGoalBoard, rowToGoalBoardKind } from "@/lib/supabase/goal-mappers";
import type { GoalBoardRow } from "@/lib/supabase/database.types";
import type { GoalBoard, GoalBoardKind } from "@/lib/goals/types";

export async function fetchGoalBoardKinds(): Promise<GoalBoardKind[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_board_kinds")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalBoardKind);
}

export async function fetchGoalBoards(): Promise<GoalBoard[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_boards")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalBoard);
}

export async function createGoalBoard(input: {
  kind: string;
  name: string;
  description?: string;
  createdBy?: string | null;
}): Promise<GoalBoard> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_boards")
    .insert({
      kind: input.kind,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalBoard(data);
}

export async function updateGoalBoard(
  id: string,
  input: { name?: string; description?: string },
): Promise<GoalBoard> {
  const supabase = getSupabase();
  const payload: Partial<GoalBoardRow> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description.trim();

  const { data, error } = await supabase
    .from("goal_boards")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalBoard(data);
}

export async function deleteGoalBoard(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("goal_boards").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Batch: liczba celów per tablica, pogrupowana po statusie — jedno zapytanie, bez N+1. */
export async function fetchGoalCountsByBoard(): Promise<
  Record<string, { total: number; atRisk: number; dueForReview: number }>
> {
  const supabase = getSupabase();
  const [{ data: goalRows, error: goalsError }, { data: reviewRows, error: reviewsError }] = await Promise.all([
    supabase.from("goals").select("board_id, status"),
    supabase
      .from("goal_reviews")
      .select("goal_id, goals!inner(board_id)")
      .is("completed_at", null),
  ]);

  if (goalsError) {
    throw new Error(goalsError.message);
  }
  if (reviewsError) {
    throw new Error(reviewsError.message);
  }

  const out: Record<string, { total: number; atRisk: number; dueForReview: number }> = {};
  for (const row of goalRows ?? []) {
    const bucket = out[row.board_id] ?? { total: 0, atRisk: 0, dueForReview: 0 };
    bucket.total += 1;
    if (row.status === "at_risk") {
      bucket.atRisk += 1;
    }
    out[row.board_id] = bucket;
  }

  // Jeden przegląd może dotyczyć wielu wpisów; liczymy unikalne cele per tablica, nie wiersze.
  const dueGoalsByBoard = new Map<string, Set<string>>();
  for (const row of (reviewRows ?? []) as Array<{ goal_id: string; goals: { board_id: string } | null }>) {
    const boardId = row.goals?.board_id;
    if (!boardId) continue;
    const set = dueGoalsByBoard.get(boardId) ?? new Set<string>();
    set.add(row.goal_id);
    dueGoalsByBoard.set(boardId, set);
  }
  for (const [boardId, goalIds] of dueGoalsByBoard.entries()) {
    const bucket = out[boardId] ?? { total: 0, atRisk: 0, dueForReview: 0 };
    bucket.dueForReview = goalIds.size;
    out[boardId] = bucket;
  }

  return out;
}
