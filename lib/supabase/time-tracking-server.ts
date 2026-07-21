import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserDisplayName, hasFullAppAccess, type UserProfile } from "@/lib/auth/types";
import { parseProcessTemplateSnapshot } from "@/lib/process/anchored-template";
import {
  buildProjectTimeSummary,
  resolveProcessStageTitle,
  type ProjectTimeEntryRow,
  type ProjectTimeSummary,
} from "@/lib/time-tracking/project-time-summary";
import {
  buildProjectHourBudget,
  countBillableWorkMinutes,
  type ProjectHourBudgetSummary,
} from "@/lib/time-tracking/project-hour-budget";
import { assertUserCanAccessProjectServer } from "@/lib/supabase/project-access-server";
import { fetchTeamProfilesServer } from "@/lib/supabase/profile-repository-server";
import {
  assertEditableStatus,
  canCreateTimeEntryForUser,
  canDeleteTimeEntry,
  canEditTimeEntry,
  canViewTeamTimeEntries,
} from "@/lib/time-tracking/permissions";
import { validateTimeEntryInput } from "@/lib/time-tracking/validation";
import {
  entryToRange,
  findOverlapMessage,
  LONG_TIMER_WARNING_MINUTES,
} from "@/lib/time-tracking/overlap";
import type {
  ActiveTimer,
  ActiveTimerView,
  CreateTimeEntryInput,
  StartTimerInput,
  StopTimerInput,
  TimeCategory,
  TimeEntry,
  TimeEntryCreatedFrom,
  TimeEntryFilters,
  TimeEntryLog,
  TimeEntryStatus,
  TimeEntryType,
  TimeEntryView,
  TimeTrackingMeta,
  UpdateTimeEntryInput,
} from "@/lib/time-tracking/types";

type AdminClient = SupabaseClient;

type TimeEntryRow = {
  id: string;
  user_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  break_minutes: number;
  category_id: string;
  entry_type_id: string;
  description: string;
  billable: boolean;
  project_id: string | null;
  client_id: string | null;
  process_stage_id: string | null;
  work_item_id: string | null;
  service_id: string | null;
  mission_id: string | null;
  leave_request_id: string | null;
  resource_plan_item_id: string | null;
  remote_work: boolean;
  delegation: boolean;
  overtime_flag: boolean;
  cost_rate_snapshot: number | null;
  client_rate_snapshot: number | null;
  status: string;
  created_from: string;
  created_at: string;
  updated_at: string;
};

type ActiveTimerRow = {
  id: string;
  user_id: string;
  started_at: string;
  date: string;
  category_id: string;
  entry_type_id: string;
  description: string;
  billable: boolean;
  project_id: string | null;
  client_id: string | null;
  work_item_id: string | null;
  service_id: string | null;
  remote_work: boolean;
  delegation: boolean;
  break_minutes: number;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapActiveTimerRow(row: ActiveTimerRow): ActiveTimer {
  return {
    id: row.id,
    userId: row.user_id,
    startedAt: row.started_at,
    date: row.date,
    categoryId: row.category_id,
    entryTypeId: row.entry_type_id,
    description: row.description,
    billable: row.billable,
    projectId: row.project_id,
    clientId: row.client_id,
    workItemId: row.work_item_id,
    serviceId: row.service_id,
    remoteWork: row.remote_work,
    delegation: row.delegation,
    breakMinutes: row.break_minutes,
    pausedAt: row.paused_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function computeElapsedMinutes(timer: ActiveTimer, now = new Date()): number {
  const startedAt = new Date(timer.startedAt).getTime();
  const pausedAt = timer.pausedAt ? new Date(timer.pausedAt).getTime() : null;
  const endMs = pausedAt ?? now.getTime();
  const grossMinutes = Math.max(0, Math.floor((endMs - startedAt) / 60_000));
  return Math.max(1, grossMinutes - timer.breakMinutes);
}

async function assertNoTimeOverlap(
  admin: AdminClient,
  userId: string,
  date: string,
  startTime: string | null,
  endTime: string | null,
  excludeEntryId?: string,
) {
  const candidate = entryToRange(startTime, endTime);
  if (!candidate) {
    return;
  }

  const { data, error } = await admin
    .from("time_entries")
    .select("id, start_time, end_time")
    .eq("user_id", userId)
    .eq("date", date)
    .not("start_time", "is", null)
    .not("end_time", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const overlap = findOverlapMessage(
    candidate,
    (data ?? []).map((row) => ({
      id: row.id as string,
      startTime: row.start_time as string | null,
      endTime: row.end_time as string | null,
    })),
    excludeEntryId,
  );

  if (overlap) {
    throw new Error(overlap);
  }
}

function formatTimeFromDate(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function toDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mapCategoryRow(row: {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  default_billable: boolean;
  requires_project: boolean;
}): TimeCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    defaultBillable: row.default_billable,
    requiresProject: row.requires_project,
  };
}

function mapEntryTypeRow(row: {
  id: string;
  name: string;
  counts_as_work: boolean;
  counts_as_absence: boolean;
  allows_billable: boolean;
  requires_description: boolean;
  requires_project: boolean;
  is_active: boolean;
  sort_order: number;
}): TimeEntryType {
  return {
    id: row.id,
    name: row.name,
    countsAsWork: row.counts_as_work,
    countsAsAbsence: row.counts_as_absence,
    allowsBillable: row.allows_billable,
    requiresDescription: row.requires_description,
    requiresProject: row.requires_project,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function mapTimeEntryRow(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    breakMinutes: row.break_minutes,
    categoryId: row.category_id,
    entryTypeId: row.entry_type_id,
    description: row.description,
    billable: row.billable,
    projectId: row.project_id,
    clientId: row.client_id,
    processStageId: row.process_stage_id,
    workItemId: row.work_item_id,
    serviceId: row.service_id,
    missionId: row.mission_id,
    leaveRequestId: row.leave_request_id,
    resourcePlanItemId: row.resource_plan_item_id,
    remoteWork: row.remote_work,
    delegation: row.delegation,
    overtimeFlag: row.overtime_flag,
    costRateSnapshot: row.cost_rate_snapshot,
    clientRateSnapshot: row.client_rate_snapshot,
    status: row.status as TimeEntryStatus,
    createdFrom: row.created_from as TimeEntryCreatedFrom,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function logTimeEntryChange(
  admin: AdminClient,
  entryId: string,
  action: string,
  userId: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
  comment = "",
) {
  const { error } = await admin.from("time_entry_logs").insert({
    time_entry_id: entryId,
    action,
    user_id: userId,
    old_value: oldValue,
    new_value: newValue,
    comment,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchTimeTrackingMetaServer(admin: AdminClient): Promise<TimeTrackingMeta> {
  const [categoriesResult, typesResult] = await Promise.all([
    admin
      .from("time_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    admin
      .from("time_entry_types")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }
  if (typesResult.error) {
    throw new Error(typesResult.error.message);
  }

  return {
    categories: (categoriesResult.data ?? []).map(mapCategoryRow),
    entryTypes: (typesResult.data ?? []).map(mapEntryTypeRow),
  };
}

async function resolveEntryViews(
  admin: AdminClient,
  rows: TimeEntryRow[],
): Promise<TimeEntryView[]> {
  if (rows.length === 0) {
    return [];
  }

  const categoryIds = [...new Set(rows.map((row) => row.category_id))];
  const typeIds = [...new Set(rows.map((row) => row.entry_type_id))];
  const projectIds = [...new Set(rows.map((row) => row.project_id).filter(Boolean))] as string[];
  const clientIds = [...new Set(rows.map((row) => row.client_id).filter(Boolean))] as string[];
  const workItemIds = [...new Set(rows.map((row) => row.work_item_id).filter(Boolean))] as string[];

  const [categories, types, projects, clients, workItems] = await Promise.all([
    admin.from("time_categories").select("id, name, color").in("id", categoryIds),
    admin.from("time_entry_types").select("id, name").in("id", typeIds),
    projectIds.length
      ? admin.from("projects").select("id, name").in("id", projectIds)
      : Promise.resolve({ data: [], error: null }),
    clientIds.length
      ? admin.from("clients").select("id, first_name, last_name").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    workItemIds.length
      ? admin.from("work_items").select("id, title").in("id", workItemIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (categories.error) throw new Error(categories.error.message);
  if (types.error) throw new Error(types.error.message);
  if (projects.error) throw new Error(projects.error.message);
  if (clients.error) throw new Error(clients.error.message);
  if (workItems.error) throw new Error(workItems.error.message);

  const categoryMap = new Map(
    (categories.data ?? []).map((row) => [row.id, { name: row.name, color: row.color }]),
  );
  const typeMap = new Map((types.data ?? []).map((row) => [row.id, row.name]));
  const projectMap = new Map((projects.data ?? []).map((row) => [row.id, row.name]));
  const clientMap = new Map(
    (clients.data ?? []).map((row) => [
      row.id,
      `${row.first_name} ${row.last_name}`.trim(),
    ]),
  );
  const workItemMap = new Map((workItems.data ?? []).map((row) => [row.id, row.title]));

  return rows.map((row) => {
    const entry = mapTimeEntryRow(row);
    const category = categoryMap.get(row.category_id);
    return {
      ...entry,
      categoryName: category?.name ?? "—",
      categoryColor: category?.color ?? "#64748b",
      entryTypeName: typeMap.get(row.entry_type_id) ?? "—",
      projectName: row.project_id ? (projectMap.get(row.project_id) ?? null) : null,
      clientName: row.client_id ? (clientMap.get(row.client_id) ?? null) : null,
      workItemTitle: row.work_item_id ? (workItemMap.get(row.work_item_id) ?? null) : null,
    };
  });
}

export async function fetchTimeEntriesServer(
  admin: AdminClient,
  actor: UserProfile,
  filters: TimeEntryFilters = {},
): Promise<TimeEntryView[]> {
  const targetUserId = filters.userId ?? actor.id;

  if (targetUserId !== actor.id && !canViewTeamTimeEntries(actor.role)) {
    throw new Error("Brak uprawnień do podglądu czasu innej osoby.");
  }

  let query = admin
    .from("time_entries")
    .select("*")
    .eq("user_id", targetUserId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("date", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("date", filters.dateTo);
  }
  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return resolveEntryViews(admin, (data ?? []) as TimeEntryRow[]);
}

export async function fetchTeamTimeEntriesServer(
  admin: AdminClient,
  actor: UserProfile,
  filters: Pick<TimeEntryFilters, "dateFrom" | "dateTo">,
): Promise<TimeEntryView[]> {
  if (!canViewTeamTimeEntries(actor.role)) {
    throw new Error("Brak uprawnień do podglądu czasu zespołu.");
  }
  if (!filters.dateFrom || !filters.dateTo) {
    throw new Error("Podaj zakres dat.");
  }

  const profiles = await fetchTeamProfilesServer();
  const userIds = profiles.map((profile) => profile.id);
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await admin
    .from("time_entries")
    .select("*")
    .in("user_id", userIds)
    .gte("date", filters.dateFrom)
    .lte("date", filters.dateTo)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return resolveEntryViews(admin, (data ?? []) as TimeEntryRow[]);
}

async function loadCategoryAndType(
  admin: AdminClient,
  categoryId: string,
  entryTypeId: string,
) {
  const [categoryResult, typeResult] = await Promise.all([
    admin.from("time_categories").select("*").eq("id", categoryId).maybeSingle(),
    admin.from("time_entry_types").select("*").eq("id", entryTypeId).maybeSingle(),
  ]);

  if (categoryResult.error) throw new Error(categoryResult.error.message);
  if (typeResult.error) throw new Error(typeResult.error.message);
  if (!categoryResult.data || !typeResult.data) {
    throw new Error("Nieprawidłowa kategoria lub typ wpisu.");
  }

  return {
    category: mapCategoryRow(categoryResult.data),
    entryType: mapEntryTypeRow(typeResult.data),
  };
}

async function resolveClientIdFromProject(
  admin: AdminClient,
  projectId: string | null | undefined,
  clientId: string | null | undefined,
): Promise<string | null> {
  if (clientId) {
    return clientId;
  }
  if (!projectId) {
    return null;
  }
  const { data, error } = await admin
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.client_id ?? null;
}

async function loadCostRateSnapshot(
  admin: AdminClient,
  userId: string,
): Promise<number | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("cost_rate")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.cost_rate ?? null;
}

async function loadClientRateSnapshot(
  admin: AdminClient,
  projectId: string | null | undefined,
): Promise<number | null> {
  if (!projectId) {
    return null;
  }

  const { data, error } = await admin
    .from("project_billing_settings")
    .select("hourly_rate_net, hourly_enabled")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.hourly_enabled || data.hourly_rate_net == null) {
    return null;
  }

  return Number(data.hourly_rate_net);
}

export async function createTimeEntryServer(
  admin: AdminClient,
  actor: UserProfile,
  input: CreateTimeEntryInput,
  options?: {
    createdFrom?: TimeEntryCreatedFrom;
    resourcePlanItemId?: string | null;
    processStageId?: string | null;
  },
): Promise<TimeEntryView> {
  const targetUserId = input.userId ?? actor.id;
  if (!canCreateTimeEntryForUser(actor, targetUserId)) {
    throw new Error("Brak uprawnień do dodania czasu dla tej osoby.");
  }

  const { category, entryType } = await loadCategoryAndType(
    admin,
    input.categoryId,
    input.entryTypeId,
  );

  const validationError = validateTimeEntryInput(input, category, entryType);
  if (validationError) {
    throw new Error(validationError);
  }

  await assertNoTimeOverlap(
    admin,
    targetUserId,
    input.date,
    input.startTime ?? null,
    input.endTime ?? null,
  );

  const clientId = await resolveClientIdFromProject(admin, input.projectId, input.clientId);
  const costRateSnapshot = await loadCostRateSnapshot(admin, targetUserId);
  const clientRateSnapshot = await loadClientRateSnapshot(admin, input.projectId);
  const billable =
    input.billable ?? (entryType.allowsBillable ? category.defaultBillable : false);

  const insertPayload = {
    user_id: targetUserId,
    date: input.date,
    start_time: input.startTime ?? null,
    end_time: input.endTime ?? null,
    duration_minutes: input.durationMinutes,
    break_minutes: input.breakMinutes ?? 0,
    category_id: input.categoryId,
    entry_type_id: input.entryTypeId,
    description: input.description?.trim() ?? "",
    billable: entryType.allowsBillable ? billable : false,
    project_id: input.projectId ?? null,
    client_id: clientId,
    work_item_id: input.workItemId ?? null,
    service_id: input.serviceId ?? null,
    mission_id: input.missionId ?? null,
    process_stage_id: options?.processStageId ?? null,
    resource_plan_item_id: options?.resourcePlanItemId ?? null,
    remote_work: input.remoteWork ?? false,
    delegation: input.delegation ?? false,
    cost_rate_snapshot: costRateSnapshot,
    client_rate_snapshot: clientRateSnapshot,
    status: "draft",
    created_from: options?.createdFrom ?? "manual",
  };

  const { data, error } = await admin
    .from("time_entries")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logTimeEntryChange(
    admin,
    data.id,
    "created",
    actor.id,
    null,
    insertPayload as Record<string, unknown>,
  );

  const views = await resolveEntryViews(admin, [data as TimeEntryRow]);
  return views[0]!;
}

export async function updateTimeEntryServer(
  admin: AdminClient,
  actor: UserProfile,
  entryId: string,
  input: UpdateTimeEntryInput,
): Promise<TimeEntryView> {
  const { data: existing, error: fetchError } = await admin
    .from("time_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!existing) {
    throw new Error("Wpis czasu nie istnieje.");
  }

  const entry = mapTimeEntryRow(existing as TimeEntryRow);
  if (!canEditTimeEntry(actor, entry)) {
    throw new Error("Brak uprawnień do edycji tego wpisu.");
  }
  assertEditableStatus(entry.status, actor.role);

  let targetUserId = entry.userId;
  if (input.userId !== undefined && input.userId !== entry.userId) {
    if (!hasFullAppAccess(actor.role)) {
      throw new Error("Brak uprawnień do zmiany przypisanej osoby.");
    }
    if (!canCreateTimeEntryForUser(actor, input.userId)) {
      throw new Error("Brak uprawnień do przypisania wpisu tej osobie.");
    }
    targetUserId = input.userId;
  }

  const categoryId = input.categoryId ?? entry.categoryId;
  const entryTypeId = input.entryTypeId ?? entry.entryTypeId;
  const { category, entryType } = await loadCategoryAndType(admin, categoryId, entryTypeId);

  const merged: CreateTimeEntryInput = {
    date: input.date ?? entry.date,
    startTime: input.startTime !== undefined ? input.startTime : entry.startTime,
    endTime: input.endTime !== undefined ? input.endTime : entry.endTime,
    durationMinutes: input.durationMinutes ?? entry.durationMinutes,
    breakMinutes: input.breakMinutes ?? entry.breakMinutes,
    categoryId,
    entryTypeId,
    description: input.description !== undefined ? input.description : entry.description,
    billable: input.billable !== undefined ? input.billable : entry.billable,
    projectId: input.projectId !== undefined ? input.projectId : entry.projectId,
    clientId: input.clientId !== undefined ? input.clientId : entry.clientId,
    workItemId: input.workItemId !== undefined ? input.workItemId : entry.workItemId,
    serviceId: input.serviceId !== undefined ? input.serviceId : entry.serviceId,
    remoteWork: input.remoteWork ?? entry.remoteWork,
    delegation: input.delegation ?? entry.delegation,
  };

  const validationError = validateTimeEntryInput(merged, category, entryType);
  if (validationError) {
    throw new Error(validationError);
  }

  await assertNoTimeOverlap(
    admin,
    targetUserId,
    merged.date,
    merged.startTime ?? null,
    merged.endTime ?? null,
    entryId,
  );

  const clientId = await resolveClientIdFromProject(admin, merged.projectId, merged.clientId);
  const billable = entryType.allowsBillable ? merged.billable : false;
  const costRateSnapshot =
    targetUserId !== entry.userId
      ? await loadCostRateSnapshot(admin, targetUserId)
      : undefined;

  const updatePayload = {
    date: merged.date,
    start_time: merged.startTime ?? null,
    end_time: merged.endTime ?? null,
    duration_minutes: merged.durationMinutes,
    break_minutes: merged.breakMinutes ?? 0,
    category_id: merged.categoryId,
    entry_type_id: merged.entryTypeId,
    description: merged.description?.trim() ?? "",
    billable,
    project_id: merged.projectId ?? null,
    client_id: clientId,
    work_item_id: merged.workItemId ?? null,
    service_id: merged.serviceId ?? null,
    remote_work: merged.remoteWork ?? false,
    delegation: merged.delegation ?? false,
    updated_at: new Date().toISOString(),
    ...(targetUserId !== entry.userId
      ? {
          user_id: targetUserId,
          cost_rate_snapshot: costRateSnapshot,
        }
      : {}),
  };

  const { data, error } = await admin
    .from("time_entries")
    .update(updatePayload)
    .eq("id", entryId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logTimeEntryChange(
    admin,
    entryId,
    "updated",
    actor.id,
    existing as Record<string, unknown>,
    updatePayload as Record<string, unknown>,
  );

  const views = await resolveEntryViews(admin, [data as TimeEntryRow]);
  return views[0]!;
}

export async function deleteTimeEntryServer(
  admin: AdminClient,
  actor: UserProfile,
  entryId: string,
): Promise<void> {
  const { data: existing, error: fetchError } = await admin
    .from("time_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!existing) {
    throw new Error("Wpis czasu nie istnieje.");
  }

  const entry = mapTimeEntryRow(existing as TimeEntryRow);
  if (!canDeleteTimeEntry(actor, entry)) {
    throw new Error("Brak uprawnień do usunięcia tego wpisu.");
  }

  await logTimeEntryChange(
    admin,
    entryId,
    "deleted",
    actor.id,
    existing as Record<string, unknown>,
    null,
  );

  const { error } = await admin.from("time_entries").delete().eq("id", entryId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchTimeEntryByIdServer(
  admin: AdminClient,
  actor: UserProfile,
  entryId: string,
): Promise<TimeEntryView | null> {
  const { data, error } = await admin
    .from("time_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const entry = mapTimeEntryRow(data as TimeEntryRow);
  if (entry.userId !== actor.id && !hasFullAppAccess(actor.role)) {
    throw new Error("Brak uprawnień do podglądu tego wpisu.");
  }

  const views = await resolveEntryViews(admin, [data as TimeEntryRow]);
  return views[0] ?? null;
}

async function resolveActiveTimerView(
  admin: AdminClient,
  row: ActiveTimerRow,
): Promise<ActiveTimerView> {
  const timer = mapActiveTimerRow(row);
  const elapsedMinutes = computeElapsedMinutes(timer);

  const [categories, types, projects, workItems] = await Promise.all([
    admin.from("time_categories").select("id, name, color").eq("id", row.category_id).maybeSingle(),
    admin.from("time_entry_types").select("id, name").eq("id", row.entry_type_id).maybeSingle(),
    row.project_id
      ? admin.from("projects").select("id, name").eq("id", row.project_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.work_item_id
      ? admin.from("work_items").select("id, title").eq("id", row.work_item_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (categories.error) throw new Error(categories.error.message);
  if (types.error) throw new Error(types.error.message);
  if (projects.error) throw new Error(projects.error.message);
  if (workItems.error) throw new Error(workItems.error.message);

  return {
    ...timer,
    categoryName: categories.data?.name ?? "—",
    categoryColor: categories.data?.color ?? "#64748b",
    entryTypeName: types.data?.name ?? "—",
    projectName: projects.data?.name ?? null,
    workItemTitle: workItems.data?.title ?? null,
    elapsedMinutes,
    isLongRunning: elapsedMinutes >= LONG_TIMER_WARNING_MINUTES,
  };
}

export async function fetchActiveTimerServer(
  admin: AdminClient,
  userId: string,
): Promise<ActiveTimerView | null> {
  const { data, error } = await admin
    .from("active_timers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return resolveActiveTimerView(admin, data as ActiveTimerRow);
}

export async function startTimerServer(
  admin: AdminClient,
  actor: UserProfile,
  input: StartTimerInput,
): Promise<ActiveTimerView> {
  const existing = await fetchActiveTimerServer(admin, actor.id);
  if (existing) {
    throw new Error("Masz już uruchomiony timer. Zatrzymaj go przed rozpoczęciem nowego.");
  }

  const { category, entryType } = await loadCategoryAndType(
    admin,
    input.categoryId,
    input.entryTypeId,
  );

  const needsProject = category.requiresProject || entryType.requiresProject;
  if (needsProject && !input.projectId && !input.serviceId) {
    throw new Error("Dla tej kategorii wybierz projekt lub zgłoszenie serwisowe.");
  }

  const clientId = await resolveClientIdFromProject(admin, input.projectId, input.clientId);
  const billable =
    input.billable ?? (entryType.allowsBillable ? category.defaultBillable : false);

  const { data, error } = await admin
    .from("active_timers")
    .insert({
      user_id: actor.id,
      date: input.date ?? toDateKey(),
      category_id: input.categoryId,
      entry_type_id: input.entryTypeId,
      description: input.description?.trim() ?? "",
      billable: entryType.allowsBillable ? billable : false,
      project_id: input.projectId ?? null,
      client_id: clientId,
      work_item_id: input.workItemId ?? null,
      service_id: input.serviceId ?? null,
      remote_work: input.remoteWork ?? false,
      delegation: input.delegation ?? false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return resolveActiveTimerView(admin, data as ActiveTimerRow);
}

export async function pauseTimerServer(
  admin: AdminClient,
  actor: UserProfile,
): Promise<ActiveTimerView> {
  const { data: existing, error: fetchError } = await admin
    .from("active_timers")
    .select("*")
    .eq("user_id", actor.id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Brak aktywnego timera.");
  if (existing.paused_at) throw new Error("Timer jest już wstrzymany.");

  const { data, error } = await admin
    .from("active_timers")
    .update({ paused_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", actor.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return resolveActiveTimerView(admin, data as ActiveTimerRow);
}

export async function resumeTimerServer(
  admin: AdminClient,
  actor: UserProfile,
): Promise<ActiveTimerView> {
  const { data: existing, error: fetchError } = await admin
    .from("active_timers")
    .select("*")
    .eq("user_id", actor.id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Brak aktywnego timera.");
  if (!existing.paused_at) throw new Error("Timer nie jest wstrzymany.");

  const pausedMs = Date.now() - new Date(existing.paused_at).getTime();
  const pausedMinutes = Math.max(0, Math.floor(pausedMs / 60_000));

  const { data, error } = await admin
    .from("active_timers")
    .update({
      paused_at: null,
      break_minutes: (existing.break_minutes ?? 0) + pausedMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", actor.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return resolveActiveTimerView(admin, data as ActiveTimerRow);
}

export async function stopTimerServer(
  admin: AdminClient,
  actor: UserProfile,
  input: StopTimerInput = {},
): Promise<TimeEntryView> {
  const { data: existing, error: fetchError } = await admin
    .from("active_timers")
    .select("*")
    .eq("user_id", actor.id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Brak aktywnego timera.");

  const timer = mapActiveTimerRow(existing as ActiveTimerRow);
  const now = new Date();
  const breakMinutes = (input.breakMinutes ?? 0) + timer.breakMinutes;
  const startedDate = new Date(timer.startedAt);
  const grossMinutes = Math.max(
    0,
    Math.floor((now.getTime() - startedDate.getTime()) / 60_000),
  );
  const durationMinutes = Math.max(1, grossMinutes - breakMinutes);

  const startTime = formatTimeFromDate(startedDate);
  const endTime = formatTimeFromDate(now);

  const entry = await createTimeEntryServer(
    admin,
    actor,
    {
      date: timer.date,
      startTime,
      endTime,
      durationMinutes,
      breakMinutes,
      categoryId: timer.categoryId,
      entryTypeId: timer.entryTypeId,
      description: input.description?.trim() || timer.description,
      billable: timer.billable,
      projectId: timer.projectId,
      clientId: timer.clientId,
      workItemId: timer.workItemId,
      serviceId: timer.serviceId,
      remoteWork: timer.remoteWork,
      delegation: timer.delegation,
    },
    { createdFrom: "timer" },
  );

  const { error: deleteError } = await admin
    .from("active_timers")
    .delete()
    .eq("user_id", actor.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return entry;
}

export async function cancelTimerServer(
  admin: AdminClient,
  actor: UserProfile,
): Promise<void> {
  const { error } = await admin.from("active_timers").delete().eq("user_id", actor.id);
  if (error) {
    throw new Error(error.message);
  }
}

function mapTimeEntryLogRow(row: {
  id: string;
  time_entry_id: string;
  action: string;
  user_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  comment: string;
  created_at: string;
}): TimeEntryLog {
  return {
    id: row.id,
    timeEntryId: row.time_entry_id,
    action: row.action,
    userId: row.user_id,
    oldValue: row.old_value,
    newValue: row.new_value,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export async function fetchTimeEntryLogsServer(
  admin: AdminClient,
  actor: UserProfile,
  entryId: string,
): Promise<TimeEntryLog[]> {
  const entry = await fetchTimeEntryByIdServer(admin, actor, entryId);
  if (!entry) {
    throw new Error("Wpis czasu nie istnieje.");
  }

  const { data, error } = await admin
    .from("time_entry_logs")
    .select("*")
    .eq("time_entry_id", entryId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapTimeEntryLogRow(row as Parameters<typeof mapTimeEntryLogRow>[0]));
}

async function fetchProjectStageTitleMap(admin: AdminClient, projectId: string) {
  const { data, error } = await admin
    .from("project_processes")
    .select("template_snapshot")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const snapshot = parseProcessTemplateSnapshot(
    (data as { template_snapshot?: unknown } | null)?.template_snapshot,
  );
  const map = new Map<string, string>();
  for (const stage of snapshot?.stages ?? []) {
    map.set(stage.id, stage.title);
  }
  return {
    titleById: map,
    orderedStages: (snapshot?.stages ?? []).map((stage) => ({ id: stage.id, title: stage.title })),
  };
}

export async function fetchProjectTimeTrackingServer(
  admin: AdminClient,
  actor: UserProfile,
  projectId: string,
): Promise<{
  entries: ProjectTimeEntryRow[];
  summary: ProjectTimeSummary;
  hourBudget: ProjectHourBudgetSummary | null;
}> {
  await assertUserCanAccessProjectServer(admin, actor, projectId);

  const { data, error } = await admin
    .from("time_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as TimeEntryRow[];
  const [baseViews, stageMeta, quotasResult] = await Promise.all([
    resolveEntryViews(admin, rows),
    fetchProjectStageTitleMap(admin, projectId),
    admin
      .from("project_contract_quotas")
      .select("id, label, quantity, unit, position, notes, project_id, created_at, updated_at")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
  ]);

  if (quotasResult.error) {
    throw new Error(quotasResult.error.message);
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: profileRows, error: profileError } = userIds.length
    ? await admin.from("profiles").select("id, first_name, last_name, email").in("id", userIds)
    : { data: [], error: null };

  if (profileError) {
    throw new Error(profileError.message);
  }

  const userNameById = new Map(
    (profileRows ?? []).map((row) => [
      row.id as string,
      getUserDisplayName({
        firstName: String(row.first_name ?? ""),
        lastName: String(row.last_name ?? ""),
        email: String(row.email ?? ""),
      }),
    ]),
  );

  const entries: ProjectTimeEntryRow[] = baseViews.map((entry) => ({
    ...entry,
    userDisplayName: userNameById.get(entry.userId) ?? "Użytkownik",
    processStageTitle: resolveProcessStageTitle(entry.processStageId, stageMeta.titleById),
  }));

  const usedMinutes = countBillableWorkMinutes(entries);
  const hourBudget = buildProjectHourBudget(
    (quotasResult.data ?? []).map((row) => ({
      id: row.id as string,
      projectId: row.project_id as string,
      label: row.label as string,
      quantity: Number(row.quantity),
      unit: row.unit as "hours" | "visits" | "other",
      position: row.position as number,
      notes: row.notes as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    })),
    usedMinutes,
    { allowUsageOnly: true },
  );

  return {
    entries,
    summary: buildProjectTimeSummary(entries, stageMeta.orderedStages),
    hourBudget,
  };
}
