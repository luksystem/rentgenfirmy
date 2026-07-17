import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/auth/types";
import type {
  ResourcePlanCompetencyRequirement,
  ResourcePlanItem,
  ResourcePlanParticipant,
} from "@/lib/resource-plan/types";
import {
  buildPlanTimeSuggestionDrafts,
  type PlanTimeSuggestionDraft,
} from "@/lib/time-tracking/plan-suggestions";
import type {
  AcceptPlanSuggestionsInput,
  PlanTimeSuggestion,
  TimeEntryView,
} from "@/lib/time-tracking/types";
import { createTimeEntryServer } from "@/lib/supabase/time-tracking-server";

type AdminClient = SupabaseClient;

type ResourcePlanItemRow = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  process_stage_id: string | null;
  task_id: string | null;
  service_intake_request_id: string | null;
  work_type_item_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  planned_hours: number | null;
  actual_hours: number | null;
  assignee_id: string | null;
  team_item_id: string | null;
  status_item_id: string | null;
  risk_item_id: string | null;
  risk_note: string;
  labor_budget: number | null;
  material_budget: number | null;
  travel_budget: number | null;
  notes: string;
  accepted_risk: boolean;
  created_by: string | null;
  linked_group_id: string | null;
  shift_with_linked_group: boolean;
  created_at: string;
  updated_at: string;
};

type ResourcePlanParticipantRow = {
  plan_item_id: string;
  user_id: string;
  role_item_id: string | null;
  is_lead: boolean;
  involvement_percent: number;
  start_at: string | null;
  end_at: string | null;
};

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
    linkedGroupId: row.linked_group_id,
    shiftWithLinkedGroup: row.shift_with_linked_group,
    participants,
    requiredCompetencies: [] as ResourcePlanCompetencyRequirement[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchParticipantsBatch(
  admin: AdminClient,
  planItemIds: string[],
): Promise<Map<string, ResourcePlanParticipant[]>> {
  const map = new Map<string, ResourcePlanParticipant[]>();
  if (planItemIds.length === 0) {
    return map;
  }

  const { data, error } = await admin
    .from("resource_plan_item_participants")
    .select("*")
    .in("plan_item_id", planItemIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as ResourcePlanParticipantRow[]) {
    const list = map.get(row.plan_item_id) ?? [];
    list.push({
      userId: row.user_id,
      roleItemId: row.role_item_id,
      isLead: row.is_lead,
      involvementPercent: row.involvement_percent,
      startAt: row.start_at,
      endAt: row.end_at,
    });
    map.set(row.plan_item_id, list);
  }

  return map;
}

async function fetchResourcePlanItemsInRangeAdmin(
  admin: AdminClient,
  dateFrom: string,
  dateTo: string,
): Promise<ResourcePlanItem[]> {
  const fromIso = `${dateFrom}T00:00:00.000Z`;
  const toIso = `${dateTo}T23:59:59.999Z`;

  const { data, error } = await admin
    .from("resource_plan_items")
    .select("*")
    .lte("start_at", toIso)
    .gte("end_at", fromIso)
    .order("start_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ResourcePlanItemRow[];
  const ids = rows.map((row) => row.id);
  const participantsByItem = await fetchParticipantsBatch(admin, ids);

  return rows.map((row) => rowToItem(row, participantsByItem.get(row.id) ?? []));
}

async function resolveMetaIds(admin: AdminClient) {
  const [categoriesResult, workTypeResult] = await Promise.all([
    admin.from("time_categories").select("id, code").in("code", ["project", "service", "company"]),
    admin.from("time_entry_types").select("id, code").eq("code", "work").maybeSingle(),
  ]);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }
  if (workTypeResult.error) {
    throw new Error(workTypeResult.error.message);
  }
  if (!workTypeResult.data) {
    throw new Error('Brak typu wpisu „Praca".');
  }

  const categoryByCode = new Map(
    (categoriesResult.data ?? []).map((row) => [row.code as string, row.id as string]),
  );

  return {
    categoryByCode,
    workEntryTypeId: workTypeResult.data.id as string,
  };
}

async function fetchProjectNames(admin: AdminClient, projectIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (projectIds.length === 0) {
    return map;
  }

  const { data, error } = await admin.from("projects").select("id, name").in("id", projectIds);
  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    map.set(row.id as string, row.name as string);
  }

  return map;
}

async function fetchWorkItemIdsByPlanItem(
  admin: AdminClient,
  planItemIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (planItemIds.length === 0) {
    return map;
  }

  const { data, error } = await admin
    .from("work_items")
    .select("id, source_id")
    .eq("source_type", "resource_plan_item")
    .in("source_id", planItemIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    map.set(row.source_id as string, row.id as string);
  }

  return map;
}

function enrichDrafts(
  drafts: PlanTimeSuggestionDraft[],
  categoryByCode: Map<string, string>,
  workEntryTypeId: string,
  projectNames: Map<string, string>,
): PlanTimeSuggestion[] {
  return drafts.map((draft) => ({
    key: draft.key,
    resourcePlanItemId: draft.resourcePlanItemId,
    date: draft.date,
    durationMinutes: draft.durationMinutes,
    title: draft.title,
    projectId: draft.projectId,
    projectName: draft.projectId ? (projectNames.get(draft.projectId) ?? null) : null,
    clientId: draft.clientId,
    processStageId: draft.processStageId,
    categoryId: categoryByCode.get(draft.categoryCode) ?? categoryByCode.get("company")!,
    entryTypeId: workEntryTypeId,
  }));
}

export async function fetchPlanTimeSuggestionsServer(
  admin: AdminClient,
  actor: UserProfile,
  dateFrom: string,
  dateTo: string,
  targetUserId = actor.id,
): Promise<PlanTimeSuggestion[]> {
  const [items, existingResult, meta] = await Promise.all([
    fetchResourcePlanItemsInRangeAdmin(admin, dateFrom, dateTo),
    admin
      .from("time_entries")
      .select("date, resource_plan_item_id")
      .eq("user_id", targetUserId)
      .gte("date", dateFrom)
      .lte("date", dateTo),
    resolveMetaIds(admin),
  ]);

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  const drafts = buildPlanTimeSuggestionDrafts({
    items,
    userId: targetUserId,
    dateFrom,
    dateTo,
    existingEntries: (existingResult.data ?? []).map((row) => ({
      date: row.date as string,
      resourcePlanItemId: (row.resource_plan_item_id as string | null) ?? null,
    })),
  });

  const projectIds = [...new Set(drafts.map((draft) => draft.projectId).filter(Boolean))] as string[];
  const projectNames = await fetchProjectNames(admin, projectIds);

  return enrichDrafts(drafts, meta.categoryByCode, meta.workEntryTypeId, projectNames);
}

export async function acceptPlanTimeSuggestionsServer(
  admin: AdminClient,
  actor: UserProfile,
  input: AcceptPlanSuggestionsInput,
): Promise<TimeEntryView[]> {
  if (input.suggestions.length === 0) {
    return [];
  }

  const dates = input.suggestions.map((item) => item.date);
  const dateFrom = dates.reduce((min, date) => (date < min ? date : min));
  const dateTo = dates.reduce((max, date) => (date > max ? date : max));

  const available = await fetchPlanTimeSuggestionsServer(admin, actor, dateFrom, dateTo);
  const availableByKey = new Map(available.map((item) => [item.key, item]));
  const workItemsByPlan = await fetchWorkItemIdsByPlanItem(
    admin,
    [...new Set(input.suggestions.map((item) => item.resourcePlanItemId))],
  );

  const created: TimeEntryView[] = [];

  for (const item of input.suggestions) {
    const key = `${item.resourcePlanItemId}:${item.date}`;
    const suggestion = availableByKey.get(key);
    if (!suggestion) {
      continue;
    }

    const entry = await createTimeEntryServer(
      admin,
      actor,
      {
        date: suggestion.date,
        durationMinutes: suggestion.durationMinutes,
        categoryId: suggestion.categoryId,
        entryTypeId: suggestion.entryTypeId,
        description: suggestion.title,
        projectId: suggestion.projectId,
        clientId: suggestion.clientId,
        workItemId: workItemsByPlan.get(suggestion.resourcePlanItemId) ?? null,
      },
      {
        createdFrom: "plan",
        resourcePlanItemId: suggestion.resourcePlanItemId,
        processStageId: suggestion.processStageId,
      },
    );

    created.push(entry);
  }

  return created;
}
