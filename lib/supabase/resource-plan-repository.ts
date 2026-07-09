import { getSupabase } from "@/lib/supabase/client";
import type {
  ResourcePlanItemInsert,
  ResourcePlanItemParticipantRow,
  ResourcePlanItemRow,
  ResourcePlanItemUpdate,
} from "@/lib/supabase/database.types";
import type { ResourcePlanItem, ResourcePlanItemInput, ResourcePlanParticipant } from "@/lib/resource-plan/types";

function rowToItem(row: ResourcePlanItemRow, participants: ResourcePlanParticipant[]): ResourcePlanItem {
  return {
    id: row.id,
    projectId: row.project_id,
    clientId: row.client_id,
    processStageId: row.process_stage_id,
    taskId: row.task_id,
    serviceIntakeRequestId: row.service_intake_request_id,
    workTypeItemId: row.work_type_item_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    plannedHours: row.planned_hours,
    actualHours: row.actual_hours,
    assigneeId: row.assignee_id,
    teamItemId: row.team_item_id,
    statusItemId: row.status_item_id,
    riskItemId: row.risk_item_id,
    riskNote: row.risk_note,
    laborBudget: row.labor_budget,
    materialBudget: row.material_budget,
    travelBudget: row.travel_budget,
    notes: row.notes,
    acceptedRisk: row.accepted_risk,
    createdBy: row.created_by,
    participants,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToRow(input: ResourcePlanItemInput): ResourcePlanItemInsert {
  return {
    project_id: input.projectId,
    client_id: input.clientId,
    process_stage_id: input.processStageId,
    task_id: input.taskId,
    service_intake_request_id: input.serviceIntakeRequestId,
    work_type_item_id: input.workTypeItemId,
    title: input.title.trim(),
    start_at: input.startAt,
    end_at: input.endAt,
    planned_hours: input.plannedHours,
    actual_hours: input.actualHours,
    assignee_id: input.assigneeId,
    team_item_id: input.teamItemId,
    status_item_id: input.statusItemId,
    risk_item_id: input.riskItemId,
    risk_note: input.riskNote.trim(),
    labor_budget: input.laborBudget,
    material_budget: input.materialBudget,
    travel_budget: input.travelBudget,
    notes: input.notes.trim(),
    accepted_risk: input.acceptedRisk,
  };
}

async function fetchParticipantsBatch(planItemIds: string[]): Promise<Map<string, ResourcePlanParticipant[]>> {
  const map = new Map<string, ResourcePlanParticipant[]>();
  if (planItemIds.length === 0) return map;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_plan_item_participants")
    .select("*")
    .in("plan_item_id", planItemIds);

  if (error) throw new Error(error.message);

  (data ?? []).forEach((row: ResourcePlanItemParticipantRow) => {
    const list = map.get(row.plan_item_id) ?? [];
    list.push({ userId: row.user_id, roleItemId: row.role_item_id, isLead: row.is_lead });
    map.set(row.plan_item_id, list);
  });

  return map;
}

async function replaceParticipants(planItemId: string, participants: ResourcePlanParticipant[]) {
  const supabase = getSupabase();
  const { error: deleteError } = await supabase
    .from("resource_plan_item_participants")
    .delete()
    .eq("plan_item_id", planItemId);
  if (deleteError) throw new Error(deleteError.message);

  if (participants.length === 0) return;

  const { error } = await supabase.from("resource_plan_item_participants").insert(
    participants.map((participant) => ({
      plan_item_id: planItemId,
      user_id: participant.userId,
      role_item_id: participant.roleItemId,
      is_lead: participant.isLead,
    })),
  );
  if (error) throw new Error(error.message);
}

/** Elementy planu nachodzące na zakres dat (do Gantt/kalendarza/listy/walidacji konfliktów). */
export async function fetchResourcePlanItemsInRange(fromIso: string, toIso: string): Promise<ResourcePlanItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_plan_items")
    .select("*")
    .lte("start_at", toIso)
    .gte("end_at", fromIso)
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const participantsByItem = await fetchParticipantsBatch(rows.map((row) => row.id));
  return rows.map((row) => rowToItem(row, participantsByItem.get(row.id) ?? []));
}

export async function fetchResourcePlanItemsForProject(projectId: string): Promise<ResourcePlanItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_plan_items")
    .select("*")
    .eq("project_id", projectId)
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const participantsByItem = await fetchParticipantsBatch(rows.map((row) => row.id));
  return rows.map((row) => rowToItem(row, participantsByItem.get(row.id) ?? []));
}

export async function createResourcePlanItem(input: ResourcePlanItemInput): Promise<ResourcePlanItem> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("resource_plan_items")
    .insert({ ...inputToRow(input), created_by: user?.id ?? null })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await replaceParticipants(data.id, input.participants);
  return rowToItem(data, input.participants);
}

export async function updateResourcePlanItem(id: string, input: ResourcePlanItemInput): Promise<ResourcePlanItem> {
  const supabase = getSupabase();
  const payload: ResourcePlanItemUpdate = { ...inputToRow(input), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("resource_plan_items").update(payload).eq("id", id).select("*").single();

  if (error) throw new Error(error.message);

  await replaceParticipants(id, input.participants);
  return rowToItem(data, input.participants);
}

export async function deleteResourcePlanItem(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("resource_plan_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
