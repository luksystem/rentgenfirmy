import { getSupabase } from "@/lib/supabase/client";
import {
  goalToInsertRow,
  goalToUpdateRow,
  rowToGoal,
  rowToGoalComment,
  rowToGoalInitiative,
  rowToGoalKpi,
  rowToGoalLink,
  rowToGoalParticipant,
  rowToGoalReview,
  rowToGoalUpdate,
} from "@/lib/supabase/goal-mappers";
import {
  computeNextPeriod,
  type Goal,
  type GoalComment,
  type GoalInitiative,
  type GoalInitiativeKind,
  type GoalKpi,
  type GoalLink,
  type GoalLinkType,
  type GoalParticipant,
  type GoalParticipantRole,
  type GoalReview,
  type GoalReviewOutcome,
  type GoalSettlementStatus,
  type GoalStatus,
  type GoalUpdateEntry,
} from "@/lib/goals/types";

export async function fetchGoalsByBoard(boardId: string): Promise<Goal[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoal);
}

export async function fetchAllGoals(): Promise<Goal[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoal);
}

export async function fetchGoalById(id: string): Promise<Goal | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("goals").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToGoal(data) : null;
}

export async function createGoal(
  input: Parameters<typeof goalToInsertRow>[0],
): Promise<Goal> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goals")
    .insert(goalToInsertRow(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoal(data);
}

export async function updateGoal(id: string, patch: Partial<Goal>): Promise<Goal> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goals")
    .update(goalToUpdateRow(patch))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoal(data);
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("goals").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Aktualizacja % realizacji / statusu z automatycznym logiem do goal_updates (historia). */
export async function updateGoalProgress(
  id: string,
  input: { progressPercent?: number; status?: GoalStatus; note?: string; authorId?: string | null },
): Promise<{ goal: Goal; update: GoalUpdateEntry }> {
  const current = await fetchGoalById(id);
  if (!current) {
    throw new Error("Cel nie istnieje.");
  }

  const nextGoal = await updateGoal(id, {
    progressPercent: input.progressPercent,
    status: input.status,
  });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_updates")
    .insert({
      goal_id: id,
      author_id: input.authorId ?? null,
      previous_progress: current.progressPercent,
      new_progress: nextGoal.progressPercent,
      previous_status: current.status,
      new_status: nextGoal.status,
      note: input.note ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { goal: nextGoal, update: rowToGoalUpdate(data) };
}

export async function fetchGoalUpdates(goalId: string): Promise<GoalUpdateEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_updates")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalUpdate);
}

// ── Uczestnicy ────────────────────────────────────────────────────────────────

export async function fetchGoalParticipants(goalId: string): Promise<GoalParticipant[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_participants")
    .select("*")
    .eq("goal_id", goalId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalParticipant);
}

/** Batch: uczestnicy dla wielu celów jednocześnie (karty na tablicy) — bez N+1. */
export async function fetchGoalParticipantsBatch(
  goalIds: string[],
): Promise<Record<string, GoalParticipant[]>> {
  if (goalIds.length === 0) {
    return {};
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_participants")
    .select("*")
    .in("goal_id", goalIds);

  if (error) {
    throw new Error(error.message);
  }

  const out: Record<string, GoalParticipant[]> = {};
  for (const row of data ?? []) {
    const participant = rowToGoalParticipant(row);
    out[participant.goalId] = [...(out[participant.goalId] ?? []), participant];
  }
  return out;
}

export async function setGoalParticipant(
  goalId: string,
  profileId: string,
  role: GoalParticipantRole,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("goal_participants")
    .upsert({ goal_id: goalId, profile_id: profileId, role }, { onConflict: "goal_id,profile_id" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeGoalParticipant(goalId: string, profileId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("goal_participants")
    .delete()
    .eq("goal_id", goalId)
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(error.message);
  }
}

// ── KPI ────────────────────────────────────────────────────────────────────────

export async function fetchGoalKpis(goalId: string): Promise<GoalKpi[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_kpis")
    .select("*")
    .eq("goal_id", goalId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalKpi);
}

export async function upsertGoalKpi(
  kpi: Partial<GoalKpi> & Pick<GoalKpi, "goalId" | "name">,
): Promise<GoalKpi> {
  const supabase = getSupabase();
  const payload = {
    id: kpi.id,
    goal_id: kpi.goalId,
    name: kpi.name.trim(),
    unit: kpi.unit ?? "",
    target_value: kpi.targetValue ?? null,
    current_value: kpi.currentValue ?? 0,
    source: kpi.source ?? "manual",
    position: kpi.position ?? 0,
  };

  const { data, error } = await supabase
    .from("goal_kpis")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalKpi(data);
}

export async function deleteGoalKpi(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("goal_kpis").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

// ── Komentarze ──────────────────────────────────────────────────────────────────

export async function fetchGoalComments(goalId: string): Promise<GoalComment[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_comments")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalComment);
}

export async function addGoalComment(input: {
  goalId: string;
  authorId?: string | null;
  authorName: string;
  body: string;
}): Promise<GoalComment> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_comments")
    .insert({
      goal_id: input.goalId,
      author_id: input.authorId ?? null,
      author_name: input.authorName,
      body: input.body.trim(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalComment(data);
}

// ── Przeglądy ────────────────────────────────────────────────────────────────────

export async function fetchGoalReviews(goalId: string): Promise<GoalReview[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_reviews")
    .select("*")
    .eq("goal_id", goalId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalReview);
}

export async function scheduleGoalReview(input: {
  goalId: string;
  scheduledAt: string;
  requiresAction?: boolean;
  note?: string;
}): Promise<GoalReview> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_reviews")
    .insert({
      goal_id: input.goalId,
      scheduled_at: input.scheduledAt,
      requires_action: input.requiresAction ?? true,
      note: input.note ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalReview(data);
}

export async function closeGoalReview(input: {
  id: string;
  closedBy: string | null;
  outcome: GoalReviewOutcome;
  progressSnapshot?: number | null;
  note?: string;
}): Promise<GoalReview> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_reviews")
    .update({
      completed_at: new Date().toISOString(),
      closed_by: input.closedBy,
      outcome: input.outcome,
      progress_snapshot: input.progressSnapshot ?? null,
      note: input.note ?? null,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalReview(data);
}

/** Batch: najbliższy otwarty przegląd per cel — jedno zapytanie dla całej tablicy. */
export async function fetchNextReviewByGoal(goalIds: string[]): Promise<Record<string, string>> {
  if (goalIds.length === 0) {
    return {};
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_reviews")
    .select("goal_id, scheduled_at")
    .in("goal_id", goalIds)
    .is("completed_at", null)
    .order("scheduled_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (!out[row.goal_id]) {
      out[row.goal_id] = row.scheduled_at;
    }
  }
  return out;
}

// ── Inicjatywy / zadania / zasoby / budżet (propozycje, bez auto-konwersji) ────

export async function fetchGoalInitiatives(goalId: string): Promise<GoalInitiative[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_initiatives")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalInitiative);
}

export async function addGoalInitiative(input: {
  goalId: string;
  kind: GoalInitiativeKind;
  title: string;
  description?: string;
  estimatedValue?: number | null;
  estimatedUnit?: string | null;
  source?: "ai" | "manual";
}): Promise<GoalInitiative> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_initiatives")
    .insert({
      goal_id: input.goalId,
      kind: input.kind,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      estimated_value: input.estimatedValue ?? null,
      estimated_unit: input.estimatedUnit ?? null,
      source: input.source ?? "manual",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalInitiative(data);
}

export async function updateGoalInitiativeStatus(
  id: string,
  status: GoalInitiative["status"],
): Promise<GoalInitiative> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_initiatives")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalInitiative(data);
}

// ── Powiązania (zadania Kanban, przyszłe problemy, dokumenty) ──────────────────

export async function fetchGoalLinks(goalId: string): Promise<GoalLink[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("goal_links").select("*").eq("goal_id", goalId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToGoalLink);
}

export async function addGoalLink(input: {
  goalId: string;
  linkedType: GoalLinkType;
  linkedId: string;
}): Promise<GoalLink> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_links")
    .insert({ goal_id: input.goalId, linked_type: input.linkedType, linked_id: input.linkedId })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToGoalLink(data);
}

export async function removeGoalLink(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("goal_links").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Batch: liczba powiązanych zadań / problemów per cel — dwa zapytania total, bez N+1. */
export async function fetchGoalLinkCounts(
  goalIds: string[],
): Promise<Record<string, { linkedTaskCount: number; openProblemCount: number }>> {
  if (goalIds.length === 0) {
    return {};
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_links")
    .select("goal_id, linked_type")
    .in("goal_id", goalIds);

  if (error) {
    throw new Error(error.message);
  }

  const out: Record<string, { linkedTaskCount: number; openProblemCount: number }> = {};
  for (const row of data ?? []) {
    const bucket = out[row.goal_id] ?? { linkedTaskCount: 0, openProblemCount: 0 };
    if (row.linked_type === "kanban_task") bucket.linkedTaskCount += 1;
    if (row.linked_type === "problem") bucket.openProblemCount += 1;
    out[row.goal_id] = bucket;
  }
  return out;
}

// ── Rozliczenie i cykliczność ───────────────────────────────────────────────────

export async function settleGoal(input: {
  id: string;
  settlementStatus: GoalSettlementStatus;
  settlementWhatWorked: string;
  settlementWhatFailed: string;
  settlementConclusions: string;
  settledBy: string | null;
}): Promise<{ goal: Goal; nextRecurringGoal: Goal | null }> {
  const current = await fetchGoalById(input.id);
  if (!current) {
    throw new Error("Cel nie istnieje.");
  }

  const goal = await updateGoal(input.id, {
    status: "settled",
    settlementStatus: input.settlementStatus,
    settlementWhatWorked: input.settlementWhatWorked,
    settlementWhatFailed: input.settlementWhatFailed,
    settlementConclusions: input.settlementConclusions,
    settledAt: new Date().toISOString(),
    settledBy: input.settledBy,
  });

  let nextRecurringGoal: Goal | null = null;

  if (current.isRecurring) {
    const { periodStart, periodEnd } = computeNextPeriod(current.periodType, current.periodEnd);
    const [participants, kpis] = await Promise.all([
      fetchGoalParticipants(current.id),
      fetchGoalKpis(current.id),
    ]);

    nextRecurringGoal = await createGoal({
      boardId: current.boardId,
      level: current.level,
      name: current.name,
      description: current.description,
      ownerId: current.ownerId,
      priority: current.priority,
      status: "planned",
      periodType: current.periodType,
      periodStart,
      periodEnd,
      methodologyId: current.methodologyId,
      methodologyFields: current.methodologyFields,
      isRecurring: true,
      recurrenceParentId: current.id,
      recurrenceRootId: current.recurrenceRootId ?? current.id,
      parentGoalId: current.parentGoalId,
      projectId: current.projectId,
      clientId: current.clientId,
      processStageId: current.processStageId,
      processMilestoneId: current.processMilestoneId,
      createdBy: current.createdBy,
    });

    await Promise.all([
      ...participants.map((participant) =>
        setGoalParticipant(nextRecurringGoal!.id, participant.profileId, participant.role),
      ),
      ...kpis.map((kpi) =>
        upsertGoalKpi({
          goalId: nextRecurringGoal!.id,
          name: kpi.name,
          unit: kpi.unit,
          targetValue: kpi.targetValue,
          currentValue: 0,
          source: kpi.source,
          position: kpi.position,
        }),
      ),
    ]);
  }

  return { goal, nextRecurringGoal };
}
