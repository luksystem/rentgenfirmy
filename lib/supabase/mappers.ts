import type { InterruptionRow, ProjectInsert, ProjectRow } from "@/lib/supabase/database.types";
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
  };
}

export function projectToInsert(
  project: Omit<Project, "id">,
): ProjectInsert {
  return {
    name: project.name,
    type: project.type,
    flow_status: project.flowStatus,
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
  return {
    id: row.id,
    date: row.date,
    person: row.person as Person,
    type: row.type as Interruption["type"],
    projectId: row.project_id,
    description: row.description,
  };
}
