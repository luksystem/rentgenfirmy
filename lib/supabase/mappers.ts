import type {
  InterruptionInsert,
  InterruptionRow,
  ProjectInsert,
  ProjectRow,
} from "@/lib/supabase/database.types";
import type {
  BlockerReason,
  FlowStatus,
  ImplementationStage,
  Interruption,
  NextStepOwner,
  Person,
  Priority,
  Project,
  ProjectInput,
  ProjectType,
} from "@/lib/types";

export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active ?? row.flow_status === "Aktywny",
    type: row.type as ProjectType,
    flowStatus: row.flow_status as FlowStatus,
    stage: row.stage as ImplementationStage,
    priority: row.priority as Priority,
    nextStepOwner: row.next_step_owner as NextStepOwner,
    nextContactDate: row.next_contact_date,
    blockerReason: (row.blocker_reason as BlockerReason | null) ?? undefined,
    notes: row.notes ?? undefined,
    lastChangedBy: row.last_changed_by as Person,
    lastChangedAt: row.last_changed_at,
    lastContactDate: row.last_contact_date,
    closeBlocker: row.close_blocker ?? undefined,
    remainingHours: row.remaining_hours ?? undefined,
    nextAction: row.next_action ?? undefined,
    closeDeadline: row.close_deadline ?? undefined,
    waitingDependsOnUs: row.waiting_depends_on_us,
    waitingIncreasesCostLater: row.waiting_increases_cost_later,
    waitingBlocksSettlement: row.waiting_blocks_settlement,
  };
}

export function projectToInsert(
  project: Omit<Project, "id">,
): ProjectInsert {
  return {
    name: project.name,
    type: project.type,
    flow_status: project.flowStatus,
    is_active: project.isActive,
    stage: project.stage,
    priority: project.priority,
    next_step_owner: project.nextStepOwner,
    next_contact_date: project.nextContactDate,
    blocker_reason: project.blockerReason ?? null,
    notes: project.notes ?? null,
    last_changed_by: project.lastChangedBy,
    last_changed_at: project.lastChangedAt,
    last_contact_date: project.lastContactDate,
    close_blocker: project.closeBlocker ?? null,
    remaining_hours: project.remainingHours ?? null,
    next_action: project.nextAction ?? null,
    close_deadline: project.closeDeadline ?? null,
    waiting_depends_on_us: project.waitingDependsOnUs ?? false,
    waiting_increases_cost_later: project.waitingIncreasesCostLater ?? false,
    waiting_blocks_settlement: project.waitingBlocksSettlement ?? false,
  };
}

export function inputToProjectPayload(
  input: ProjectInput,
  audit: Pick<Project, "lastChangedBy" | "lastChangedAt" | "lastContactDate">,
): Omit<Project, "id"> {
  return {
    ...input,
    ...audit,
  };
}

export function rowToInterruption(row: InterruptionRow): Interruption {
  const kind = row.kind === "focus" ? "focus" : "interruption";

  return {
    id: row.id,
    date: row.date,
    person: row.person as Person,
    kind,
    type: row.type,
    projectId: row.project_id,
    description: row.description ?? "",
    durationMinutes: row.duration_minutes ?? null,
    wasNecessary: row.was_necessary ?? false,
    isRecurring: row.is_recurring ?? false,
  };
}

export function interruptionToInsert(
  interruption: Omit<Interruption, "id">,
): InterruptionInsert {
  return {
    date: interruption.date,
    person: interruption.person,
    type: interruption.kind === "focus" ? "" : interruption.type,
    project_id: interruption.projectId,
    description: interruption.description ?? "",
    was_necessary: interruption.wasNecessary,
    is_recurring: interruption.isRecurring,
    duration_minutes: interruption.durationMinutes,
    kind: interruption.kind,
  };
}
