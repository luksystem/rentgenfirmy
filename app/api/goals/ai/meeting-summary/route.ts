import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { generateGoalReviewMeetingSummary } from "@/lib/ai/goal-review-meeting-summary";
import { getUserDisplayName } from "@/lib/auth/types";
import { resolveReviewOutcomeLabel } from "@/lib/goals/module-settings";
import { GOAL_STATUS_LABELS, type GoalStatus } from "@/lib/goals/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  rowToGoalReviewMeeting,
  rowToGoalReviewMeetingAction,
  rowToGoalReviewMeetingItem,
} from "@/lib/supabase/goal-mappers";
import { fetchGoalModuleSettingsAdmin } from "@/lib/supabase/goal-settings-repository";

function profileDisplayName(row: {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}) {
  return getUserDisplayName({
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
  });
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedProfile();
  } catch (error) {
    return jsonError(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane żądania." }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const meetingId = typeof data.meetingId === "string" ? data.meetingId : "";
  if (!meetingId) {
    return NextResponse.json({ error: "Brak meetingId." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();

    const { data: meetingRow, error: meetingError } = await admin
      .from("goal_review_meetings")
      .select("*")
      .eq("id", meetingId)
      .maybeSingle();

    if (meetingError) throw new Error(meetingError.message);
    if (!meetingRow) {
      return NextResponse.json({ error: "Spotkanie nie istnieje." }, { status: 404 });
    }

    const meeting = rowToGoalReviewMeeting(meetingRow);

    const [{ data: itemRows }, { data: actionRows }, { data: boardRow }] = await Promise.all([
      admin
        .from("goal_review_meeting_items")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("sort_order", { ascending: true }),
      admin.from("goal_review_meeting_actions").select("*").eq("meeting_id", meetingId),
      admin.from("goal_boards").select("name").eq("id", meeting.boardId).maybeSingle(),
    ]);

    const items = (itemRows ?? []).map(rowToGoalReviewMeetingItem);
    const actions = (actionRows ?? []).map(rowToGoalReviewMeetingAction);
    const boardName = boardRow?.name ?? "Tablica celów";

    const goalIds = [...new Set(items.map((item) => item.goalId))];
    const { data: goals } = goalIds.length
      ? await admin.from("goals").select("id, name, owner_id, status").in("id", goalIds)
      : { data: [] as Array<{ id: string; name: string; owner_id: string | null; status: string }> };

    const ownerIds = [...new Set((goals ?? []).map((g) => g.owner_id).filter(Boolean))] as string[];
    const profileIds = [...new Set([...meeting.participantIds, ...ownerIds])];
    const { data: profiles } = profileIds.length
      ? await admin.from("profiles").select("id, first_name, last_name, email").in("id", profileIds)
      : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }> };

    const nameById = new Map(
      (profiles ?? []).map((row) => [row.id, profileDisplayName(row)] as const),
    );
    const goalById = new Map((goals ?? []).map((g) => [g.id, g] as const));
    const moduleSettings = await fetchGoalModuleSettingsAdmin();

    const summary = await generateGoalReviewMeetingSummary({
      boardName,
      plannedMinutes: meeting.plannedMinutes,
      participantNames: meeting.participantIds.map((id) => nameById.get(id) ?? id),
      items: items.map((item) => {
        const goal = goalById.get(item.goalId);
        const outcomeLabel = item.outcome
          ? resolveReviewOutcomeLabel(item.outcome, moduleSettings.reviewOutcomes)
          : item.outcome;
        const status = goal?.status as GoalStatus | undefined;
        return {
          goalName: goal?.name ?? item.goalId,
          ownerName: goal?.owner_id ? nameById.get(goal.owner_id) ?? "—" : "—",
          deepDive: item.deepDive,
          outcome: outcomeLabel,
          notes: item.notes,
          statusLabel: status ? GOAL_STATUS_LABELS[status] : goal?.status,
        };
      }),
      actions: actions.map((action) => ({
        goalName: goalById.get(action.goalId)?.name ?? action.goalId,
        title: action.title,
        hasKanbanTask: Boolean(action.kanbanTaskId),
      })),
    });

    const now = new Date().toISOString();
    const fromItems = items.reduce((sum, item) => sum + (item.actualSeconds ?? 0), 0);
    const fromWallClock = meeting.startedAt
      ? Math.max(0, Math.round((Date.now() - new Date(meeting.startedAt).getTime()) / 1000))
      : 0;
    const actualDurationSeconds = fromItems > 0 ? fromItems : fromWallClock > 0 ? fromWallClock : null;

    const { error: completeError } = await admin
      .from("goal_review_meetings")
      .update({
        status: "completed",
        ai_summary: summary,
        completed_at: now,
        updated_at: now,
        actual_duration_seconds: actualDurationSeconds,
      })
      .eq("id", meetingId);

    if (completeError) throw new Error(completeError.message);

    return NextResponse.json({
      summary,
      meetingId,
      actualDurationSeconds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nie udało się wygenerować podsumowania.",
      },
      { status: 500 },
    );
  }
}
