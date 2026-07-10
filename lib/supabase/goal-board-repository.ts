import { getSupabase } from "@/lib/supabase/client";
import { rowToGoalBoard, rowToGoalBoardKind } from "@/lib/supabase/goal-mappers";
import type { GoalBoardKindRow, GoalBoardRow } from "@/lib/supabase/database.types";
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

/** Generuje unikalny `code` dla nowej kategorii z etykiety (slug), z sufiksem numerycznym przy kolizji. */
function slugifyBoardKindCode(label: string): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[ąàáâä]/g, "a")
      .replace(/[ćç]/g, "c")
      .replace(/[ęèéêë]/g, "e")
      .replace(/[łl]/g, "l")
      .replace(/[ńñ]/g, "n")
      .replace(/[óòôö]/g, "o")
      .replace(/[śß]/g, "s")
      .replace(/[źżzž]/g, "z")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "kategoria";
  return base;
}

export async function createGoalBoardKind(input: {
  label: string;
  description?: string;
  icon?: string;
  visibility?: "all" | "admin_only";
}): Promise<GoalBoardKind> {
  const supabase = getSupabase();
  const baseCode = slugifyBoardKindCode(input.label);

  let code = baseCode;
  let attempt = 1;
  // Kod musi być unikalny (primary key) — próbujemy z sufiksem przy kolizji nazwy.
  while (attempt < 20) {
    const { data: existing } = await supabase
      .from("goal_board_kinds")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    attempt += 1;
    code = `${baseCode}_${attempt}`;
  }

  const { data, error } = await supabase
    .from("goal_board_kinds")
    .insert({
      code,
      label: input.label.trim(),
      description: input.description?.trim() ?? "",
      icon: input.icon ?? "target",
      visibility: input.visibility ?? "all",
      sort_order: 100,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalBoardKind(data);
}

export async function updateGoalBoardKind(
  code: string,
  input: { label?: string; description?: string; icon?: string; visibility?: "all" | "admin_only" },
): Promise<GoalBoardKind> {
  const supabase = getSupabase();
  const payload: Partial<GoalBoardKindRow> = {};
  if (input.label !== undefined) payload.label = input.label.trim();
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.icon !== undefined) payload.icon = input.icon;
  if (input.visibility !== undefined) payload.visibility = input.visibility;

  const { data, error } = await supabase
    .from("goal_board_kinds")
    .update(payload)
    .eq("code", code)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalBoardKind(data);
}

/** Usuwa kategorię tylko gdy nie ma żadnych tablic tego typu (FK `goal_boards.kind`). */
export async function deleteGoalBoardKind(code: string): Promise<void> {
  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from("goal_boards")
    .select("id", { count: "exact", head: true })
    .eq("kind", code);

  if (countError) {
    throw new Error(countError.message);
  }
  if ((count ?? 0) > 0) {
    throw new Error(
      "Nie można usunąć kategorii, która ma przypisane tablice. Usuń najpierw wszystkie tablice tego typu.",
    );
  }

  const { error } = await supabase.from("goal_board_kinds").delete().eq("code", code);

  if (error) {
    throw new Error(error.message);
  }
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
