import { getSupabase } from "@/lib/supabase/client";
import {
  rowToGoalReviewMeeting,
  rowToGoalReviewMeetingAction,
  rowToGoalReviewMeetingItem,
} from "@/lib/supabase/goal-mappers";
import type {
  GoalReviewMeetingAction,
  GoalReviewMeetingItem,
  GoalReviewMeetingItemStatus,
  GoalReviewMeetingStatus,
  GoalReviewMeetingWithDetails,
  GoalReviewOutcome,
} from "@/lib/goals/types";

async function fetchMeetingItems(meetingId: string): Promise<GoalReviewMeetingItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_review_meeting_items")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToGoalReviewMeetingItem);
}

async function fetchMeetingActions(meetingId: string): Promise<GoalReviewMeetingAction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_review_meeting_actions")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToGoalReviewMeetingAction);
}

export async function fetchGoalReviewMeetingWithDetails(
  meetingId: string,
): Promise<GoalReviewMeetingWithDetails | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_review_meetings")
    .select("*")
    .eq("id", meetingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const meeting = rowToGoalReviewMeeting(data);
  const [items, actions, board] = await Promise.all([
    fetchMeetingItems(meetingId),
    fetchMeetingActions(meetingId),
    supabase.from("goal_boards").select("name").eq("id", meeting.boardId).maybeSingle(),
  ]);

  return {
    ...meeting,
    items,
    actions,
    boardName: board.data?.name ?? undefined,
  };
}

export async function fetchCompletedGoalReviewMeetings(options?: {
  boardId?: string;
  limit?: number;
}): Promise<GoalReviewMeetingWithDetails[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("goal_review_meetings")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (options?.boardId) {
    query = query.eq("board_id", options.boardId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const meetings = (data ?? []).map(rowToGoalReviewMeeting);
  if (meetings.length === 0) return [];

  const meetingIds = meetings.map((m) => m.id);
  const boardIds = [...new Set(meetings.map((m) => m.boardId))];

  const [itemsResult, actionsResult, boardsResult] = await Promise.all([
    supabase.from("goal_review_meeting_items").select("*").in("meeting_id", meetingIds),
    supabase.from("goal_review_meeting_actions").select("*").in("meeting_id", meetingIds),
    supabase.from("goal_boards").select("id, name").in("id", boardIds),
  ]);

  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (actionsResult.error) throw new Error(actionsResult.error.message);
  if (boardsResult.error) throw new Error(boardsResult.error.message);

  const itemsByMeeting: Record<string, GoalReviewMeetingItem[]> = {};
  for (const row of itemsResult.data ?? []) {
    const item = rowToGoalReviewMeetingItem(row);
    itemsByMeeting[item.meetingId] = [...(itemsByMeeting[item.meetingId] ?? []), item];
  }
  const actionsByMeeting: Record<string, GoalReviewMeetingAction[]> = {};
  for (const row of actionsResult.data ?? []) {
    const action = rowToGoalReviewMeetingAction(row);
    actionsByMeeting[action.meetingId] = [...(actionsByMeeting[action.meetingId] ?? []), action];
  }
  const boardNames = new Map((boardsResult.data ?? []).map((b) => [b.id as string, b.name as string]));

  return meetings.map((meeting) => ({
    ...meeting,
    items: (itemsByMeeting[meeting.id] ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
    actions: actionsByMeeting[meeting.id] ?? [],
    boardName: boardNames.get(meeting.boardId),
  }));
}

export async function createGoalReviewMeeting(input: {
  boardId: string;
  facilitatorId: string | null;
  plannedMinutes: number;
  summaryBufferSeconds: number;
  participantIds: string[];
  items: Array<{
    goalId: string;
    sortOrder: number;
    plannedSeconds: number;
    deepDive: boolean;
  }>;
}): Promise<GoalReviewMeetingWithDetails> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("goal_review_meetings")
    .insert({
      board_id: input.boardId,
      facilitator_id: input.facilitatorId,
      planned_minutes: input.plannedMinutes,
      summary_buffer_seconds: input.summaryBufferSeconds,
      status: "draft" satisfies GoalReviewMeetingStatus,
      participant_ids: input.participantIds,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const meeting = rowToGoalReviewMeeting(data);

  if (input.items.length > 0) {
    const { error: itemsError } = await supabase.from("goal_review_meeting_items").insert(
      input.items.map((item) => ({
        meeting_id: meeting.id,
        goal_id: item.goalId,
        sort_order: item.sortOrder,
        planned_seconds: item.plannedSeconds,
        deep_dive: item.deepDive,
        remaining_seconds: item.plannedSeconds,
        status: "pending" satisfies GoalReviewMeetingItemStatus,
        notes: "",
        created_at: now,
        updated_at: now,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  const details = await fetchGoalReviewMeetingWithDetails(meeting.id);
  if (!details) throw new Error("Nie udało się utworzyć spotkania przeglądu.");
  return details;
}

export async function startGoalReviewMeeting(meetingId: string): Promise<GoalReviewMeetingWithDetails> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const details = await fetchGoalReviewMeetingWithDetails(meetingId);
  if (!details) throw new Error("Spotkanie nie istnieje.");

  const { error } = await supabase
    .from("goal_review_meetings")
    .update({
      status: "in_progress",
      started_at: details.startedAt ?? now,
      updated_at: now,
    })
    .eq("id", meetingId);

  if (error) throw new Error(error.message);

  const firstPending = details.items.find((item) => item.status === "pending" || item.status === "active");
  if (firstPending && firstPending.status !== "active") {
    await activateMeetingItem(firstPending.id, firstPending.plannedSeconds);
  }

  const next = await fetchGoalReviewMeetingWithDetails(meetingId);
  if (!next) throw new Error("Nie udało się uruchomić spotkania.");
  return next;
}

export async function updateMeetingSummaryBuffer(
  meetingId: string,
  summaryBufferSeconds: number,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("goal_review_meetings")
    .update({
      summary_buffer_seconds: Math.max(0, Math.floor(summaryBufferSeconds)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId);
  if (error) throw new Error(error.message);
}

export async function updateMeetingItemNotes(itemId: string, notes: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("goal_review_meeting_items")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function updateMeetingItemFields(
  itemId: string,
  patch: Partial<{
    plannedSeconds: number;
    remainingSeconds: number | null;
    actualSeconds: number | null;
    outcome: GoalReviewOutcome | null;
    notes: string;
    status: GoalReviewMeetingItemStatus;
    goalReviewId: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }>,
): Promise<GoalReviewMeetingItem> {
  const supabase = getSupabase();
  const payload: {
    updated_at: string;
    planned_seconds?: number;
    remaining_seconds?: number | null;
    actual_seconds?: number | null;
    outcome?: string | null;
    notes?: string;
    status?: string;
    goal_review_id?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
  } = { updated_at: new Date().toISOString() };
  if (patch.plannedSeconds !== undefined) payload.planned_seconds = patch.plannedSeconds;
  if (patch.remainingSeconds !== undefined) payload.remaining_seconds = patch.remainingSeconds;
  if (patch.actualSeconds !== undefined) payload.actual_seconds = patch.actualSeconds;
  if (patch.outcome !== undefined) payload.outcome = patch.outcome;
  if (patch.notes !== undefined) payload.notes = patch.notes;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.goalReviewId !== undefined) payload.goal_review_id = patch.goalReviewId;
  if (patch.startedAt !== undefined) payload.started_at = patch.startedAt;
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;

  const { data, error } = await supabase
    .from("goal_review_meeting_items")
    .update(payload)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToGoalReviewMeetingItem(data);
}

export async function activateMeetingItem(
  itemId: string,
  remainingSeconds: number,
): Promise<GoalReviewMeetingItem> {
  return updateMeetingItemFields(itemId, {
    status: "active",
    remainingSeconds,
    startedAt: new Date().toISOString(),
  });
}

export async function completeMeetingItem(input: {
  itemId: string;
  outcome: GoalReviewOutcome;
  notes: string;
  actualSeconds: number;
  goalReviewId?: string | null;
}): Promise<GoalReviewMeetingItem> {
  return updateMeetingItemFields(input.itemId, {
    status: "done",
    outcome: input.outcome,
    notes: input.notes,
    actualSeconds: input.actualSeconds,
    remainingSeconds: 0,
    goalReviewId: input.goalReviewId ?? null,
    completedAt: new Date().toISOString(),
  });
}

export async function addMeetingAction(input: {
  meetingId: string;
  goalId: string;
  itemId?: string | null;
  initiativeId?: string | null;
  kanbanTaskId?: string | null;
  title: string;
  createdBy: string | null;
}): Promise<GoalReviewMeetingAction> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("goal_review_meeting_actions")
    .insert({
      meeting_id: input.meetingId,
      goal_id: input.goalId,
      item_id: input.itemId ?? null,
      initiative_id: input.initiativeId ?? null,
      kanban_task_id: input.kanbanTaskId ?? null,
      title: input.title.trim(),
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToGoalReviewMeetingAction(data);
}

export async function completeGoalReviewMeeting(input: {
  meetingId: string;
  aiSummary: string;
}): Promise<GoalReviewMeetingWithDetails> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("goal_review_meetings")
    .update({
      status: "completed",
      ai_summary: input.aiSummary,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.meetingId);

  if (error) throw new Error(error.message);

  const details = await fetchGoalReviewMeetingWithDetails(input.meetingId);
  if (!details) throw new Error("Nie udało się zakończyć spotkania.");
  return details;
}

export async function cancelGoalReviewMeeting(meetingId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("goal_review_meetings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId);
  if (error) throw new Error(error.message);
}
