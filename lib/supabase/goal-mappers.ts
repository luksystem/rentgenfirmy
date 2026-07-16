import type {
  GoalAiSuggestionRow,
  GoalBoardKindRow,
  GoalBoardRow,
  GoalCommentRow,
  GoalDeferralRow,
  GoalInitiativeRow,
  GoalKpiRow,
  GoalLinkRow,
  GoalMethodologyRow,
  GoalParticipantRow,
  GoalReviewMeetingActionRow,
  GoalReviewMeetingItemRow,
  GoalReviewMeetingRow,
  GoalReviewRow,
  GoalRow,
  GoalUpdateRow,
} from "@/lib/supabase/database.types";
import type {
  Goal,
  GoalAiSuggestion,
  GoalAiSuggestedStructure,
  GoalBoard,
  GoalBoardKind,
  GoalComment,
  GoalDeferral,
  GoalDeferralReason,
  GoalInitiative,
  GoalKpi,
  GoalLevel,
  GoalLink,
  GoalMethodology,
  GoalMethodologyFieldSchema,
  GoalParticipant,
  GoalPeriodType,
  GoalPriority,
  GoalReview,
  GoalReviewMeeting,
  GoalReviewMeetingAction,
  GoalReviewMeetingItem,
  GoalReviewMeetingItemStatus,
  GoalReviewMeetingStatus,
  GoalReviewOutcome,
  GoalSettlementStatus,
  GoalStatus,
  GoalUpdateEntry,
} from "@/lib/goals/types";

export function rowToGoalBoardKind(row: GoalBoardKindRow): GoalBoardKind {
  return {
    code: row.code,
    label: row.label,
    description: row.description,
    icon: row.icon,
    visibility: row.visibility === "admin_only" ? "admin_only" : "all",
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export function rowToGoalBoard(row: GoalBoardRow): GoalBoard {
  const frequency =
    row.review_frequency === "daily" ||
    row.review_frequency === "weekly" ||
    row.review_frequency === "monthly" ||
    row.review_frequency === "quarterly" ||
    row.review_frequency === "annual"
      ? row.review_frequency
      : null;
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewFrequency: frequency,
    reviewWeekday: row.review_weekday ?? null,
    reviewResponsibleId: row.review_responsible_id ?? null,
    reviewNotify: row.review_notify ?? true,
  };
}

function normalizeFieldSchema(value: unknown): GoalMethodologyFieldSchema[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is GoalMethodologyFieldSchema =>
      Boolean(entry) && typeof entry === "object" && "key" in (entry as Record<string, unknown>),
  );
}

export function rowToGoalMethodology(row: GoalMethodologyRow): GoalMethodology {
  return {
    code: row.code,
    name: row.name,
    shortDescription: row.short_description,
    purpose: row.purpose,
    whenToUse: row.when_to_use,
    whenNotToUse: row.when_not_to_use,
    structureMd: row.structure_md,
    exampleMd: row.example_md,
    bestPracticesMd: row.best_practices_md,
    commonMistakesMd: row.common_mistakes_md,
    fieldSchema: normalizeFieldSchema(row.field_schema),
    schemaVersion: row.schema_version,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    boardId: row.board_id,
    level: row.level as GoalLevel,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    priority: row.priority as GoalPriority,
    status: row.status as GoalStatus,
    periodType: row.period_type as GoalPeriodType,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    progressPercent: Number(row.progress_percent),
    methodologyId: row.methodology_id,
    methodologyFields:
      row.methodology_fields && typeof row.methodology_fields === "object"
        ? (row.methodology_fields as Record<string, unknown>)
        : {},
    isRecurring: row.is_recurring,
    recurrenceParentId: row.recurrence_parent_id,
    recurrenceRootId: row.recurrence_root_id,
    parentGoalId: row.parent_goal_id,
    projectId: row.project_id,
    clientId: row.client_id,
    processStageId: row.process_stage_id,
    processMilestoneId: row.process_milestone_id,
    settlementStatus: row.settlement_status as GoalSettlementStatus | null,
    settlementWhatWorked: row.settlement_what_worked,
    settlementWhatFailed: row.settlement_what_failed,
    settlementConclusions: row.settlement_conclusions,
    settledAt: row.settled_at,
    settledBy: row.settled_by,
    needsRevisit: Boolean(row.needs_revisit),
    revisitAt: row.revisit_at,
    deferralCount: Number(row.deferral_count ?? 0),
    lastDeferralReason:
      row.last_deferral_reason === "internal" || row.last_deferral_reason === "external"
        ? (row.last_deferral_reason as GoalDeferralReason)
        : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function goalToInsertRow(goal: Partial<Goal> & Pick<Goal, "boardId" | "level" | "name" | "periodType" | "periodStart" | "periodEnd">) {
  return {
    board_id: goal.boardId,
    level: goal.level,
    name: goal.name.trim(),
    description: goal.description?.trim() ?? "",
    owner_id: goal.ownerId ?? null,
    priority: goal.priority ?? "normal",
    status: goal.status ?? "planned",
    period_type: goal.periodType,
    period_start: goal.periodStart,
    period_end: goal.periodEnd,
    progress_percent: goal.progressPercent ?? 0,
    methodology_id: goal.methodologyId ?? null,
    methodology_fields: goal.methodologyFields ?? {},
    is_recurring: goal.isRecurring ?? false,
    recurrence_parent_id: goal.recurrenceParentId ?? null,
    recurrence_root_id: goal.recurrenceRootId ?? null,
    parent_goal_id: goal.parentGoalId ?? null,
    project_id: goal.projectId ?? null,
    client_id: goal.clientId ?? null,
    process_stage_id: goal.processStageId ?? null,
    process_milestone_id: goal.processMilestoneId ?? null,
    created_by: goal.createdBy ?? null,
  };
}

export function goalToUpdateRow(goal: Partial<Goal>): Partial<GoalRow> {
  const row: Partial<GoalRow> = {};
  if (goal.name !== undefined) row.name = goal.name.trim();
  if (goal.description !== undefined) row.description = goal.description.trim();
  if (goal.ownerId !== undefined) row.owner_id = goal.ownerId;
  if (goal.priority !== undefined) row.priority = goal.priority;
  if (goal.status !== undefined) row.status = goal.status;
  if (goal.periodType !== undefined) row.period_type = goal.periodType;
  if (goal.periodStart !== undefined) row.period_start = goal.periodStart;
  if (goal.periodEnd !== undefined) row.period_end = goal.periodEnd;
  if (goal.progressPercent !== undefined) row.progress_percent = goal.progressPercent;
  if (goal.methodologyId !== undefined) row.methodology_id = goal.methodologyId;
  if (goal.methodologyFields !== undefined) row.methodology_fields = goal.methodologyFields;
  if (goal.isRecurring !== undefined) row.is_recurring = goal.isRecurring;
  if (goal.parentGoalId !== undefined) row.parent_goal_id = goal.parentGoalId;
  if (goal.projectId !== undefined) row.project_id = goal.projectId;
  if (goal.clientId !== undefined) row.client_id = goal.clientId;
  if (goal.processStageId !== undefined) row.process_stage_id = goal.processStageId;
  if (goal.processMilestoneId !== undefined) row.process_milestone_id = goal.processMilestoneId;
  if (goal.settlementStatus !== undefined) row.settlement_status = goal.settlementStatus;
  if (goal.settlementWhatWorked !== undefined) row.settlement_what_worked = goal.settlementWhatWorked;
  if (goal.settlementWhatFailed !== undefined) row.settlement_what_failed = goal.settlementWhatFailed;
  if (goal.settlementConclusions !== undefined) row.settlement_conclusions = goal.settlementConclusions;
  if (goal.settledAt !== undefined) row.settled_at = goal.settledAt;
  if (goal.settledBy !== undefined) row.settled_by = goal.settledBy;
  if (goal.needsRevisit !== undefined) row.needs_revisit = goal.needsRevisit;
  if (goal.revisitAt !== undefined) row.revisit_at = goal.revisitAt;
  if (goal.deferralCount !== undefined) row.deferral_count = goal.deferralCount;
  if (goal.lastDeferralReason !== undefined) row.last_deferral_reason = goal.lastDeferralReason;
  row.updated_at = new Date().toISOString();
  return row;
}

export function rowToGoalParticipant(row: GoalParticipantRow): GoalParticipant {
  return {
    goalId: row.goal_id,
    profileId: row.profile_id,
    role: row.role === "reviewer" ? "reviewer" : "contributor",
  };
}

export function rowToGoalKpi(row: GoalKpiRow): GoalKpi {
  return {
    id: row.id,
    goalId: row.goal_id,
    name: row.name,
    unit: row.unit,
    targetValue: row.target_value === null ? null : Number(row.target_value),
    currentValue: Number(row.current_value),
    source: row.source === "system" ? "system" : "manual",
    position: row.position,
  };
}

export function rowToGoalUpdate(row: GoalUpdateRow): GoalUpdateEntry {
  return {
    id: row.id,
    goalId: row.goal_id,
    authorId: row.author_id,
    previousProgress: row.previous_progress === null ? null : Number(row.previous_progress),
    newProgress: row.new_progress === null ? null : Number(row.new_progress),
    previousStatus: row.previous_status as GoalStatus | null,
    newStatus: row.new_status as GoalStatus | null,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function rowToGoalComment(row: GoalCommentRow): GoalComment {
  return {
    id: row.id,
    goalId: row.goal_id,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function rowToGoalReview(row: GoalReviewRow): GoalReview {
  return {
    id: row.id,
    goalId: row.goal_id,
    scheduledAt: row.scheduled_at,
    requiresAction: row.requires_action,
    completedAt: row.completed_at,
    closedBy: row.closed_by,
    outcome: row.outcome as GoalReview["outcome"],
    progressSnapshot: row.progress_snapshot === null ? null : Number(row.progress_snapshot),
    note: row.note,
    createdAt: row.created_at,
  };
}

export function rowToGoalInitiative(row: GoalInitiativeRow): GoalInitiative {
  return {
    id: row.id,
    goalId: row.goal_id,
    kind: row.kind as GoalInitiative["kind"],
    title: row.title,
    description: row.description,
    estimatedValue: row.estimated_value === null ? null : Number(row.estimated_value),
    estimatedUnit: row.estimated_unit,
    status: row.status as GoalInitiative["status"],
    convertedTaskId: row.converted_task_id,
    source: row.source === "ai" ? "ai" : "manual",
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
  };
}

export function rowToGoalDeferral(row: GoalDeferralRow): GoalDeferral {
  return {
    id: row.id,
    goalId: row.goal_id,
    meetingId: row.meeting_id,
    reason: row.reason === "external" ? "external" : "internal",
    note: row.note,
    previousPeriodStart: row.previous_period_start,
    previousPeriodEnd: row.previous_period_end,
    newPeriodStart: row.new_period_start,
    newPeriodEnd: row.new_period_end,
    markedUndelivered: Boolean(row.marked_undelivered),
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function rowToGoalLink(row: GoalLinkRow): GoalLink {
  return {
    id: row.id,
    goalId: row.goal_id,
    linkedType: row.linked_type as GoalLink["linkedType"],
    linkedId: row.linked_id,
    createdAt: row.created_at,
  };
}

export function rowToGoalAiSuggestion(row: GoalAiSuggestionRow): GoalAiSuggestion {
  const structure =
    row.structure && typeof row.structure === "object"
      ? (row.structure as GoalAiSuggestedStructure)
      : ({} as GoalAiSuggestedStructure);
  const alternatives = Array.isArray(row.alternatives)
    ? (row.alternatives as GoalAiSuggestion["alternatives"])
    : [];
  return {
    id: row.id,
    goalId: row.goal_id,
    trigger: row.trigger as GoalAiSuggestion["trigger"],
    inputDescription: row.input_description,
    suggestedMethodologyCode: row.suggested_methodology_code,
    justification: row.justification,
    alternatives,
    structure,
    vagueWarning: row.vague_warning,
    accepted: row.accepted,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function parseParticipantIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

export function rowToGoalReviewMeeting(row: GoalReviewMeetingRow): GoalReviewMeeting {
  return {
    id: row.id,
    boardId: row.board_id,
    facilitatorId: row.facilitator_id,
    plannedMinutes: row.planned_minutes,
    summaryBufferSeconds: row.summary_buffer_seconds,
    status: row.status as GoalReviewMeetingStatus,
    participantIds: parseParticipantIds(row.participant_ids),
    aiSummary: row.ai_summary,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    actualDurationSeconds: row.actual_duration_seconds ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToGoalReviewMeetingItem(row: GoalReviewMeetingItemRow): GoalReviewMeetingItem {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    goalId: row.goal_id,
    sortOrder: row.sort_order,
    plannedSeconds: row.planned_seconds,
    deepDive: row.deep_dive,
    actualSeconds: row.actual_seconds,
    remainingSeconds: row.remaining_seconds,
    outcome: (row.outcome as GoalReviewOutcome | null) ?? null,
    notes: row.notes ?? "",
    status: row.status as GoalReviewMeetingItemStatus,
    goalReviewId: row.goal_review_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToGoalReviewMeetingAction(row: GoalReviewMeetingActionRow): GoalReviewMeetingAction {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    goalId: row.goal_id,
    itemId: row.item_id,
    initiativeId: row.initiative_id,
    kanbanTaskId: row.kanban_task_id,
    title: row.title,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
