import type { SupabaseClient } from "@supabase/supabase-js";
import { hasFullAppAccess, type UserProfile } from "@/lib/auth/types";
import {
  assertEditableStatus,
  canCreateTimeEntryForUser,
  canDeleteTimeEntry,
  canEditTimeEntry,
  canViewTeamTimeEntries,
} from "@/lib/time-tracking/permissions";
import { validateTimeEntryInput } from "@/lib/time-tracking/validation";
import type {
  CreateTimeEntryInput,
  TimeCategory,
  TimeEntry,
  TimeEntryCreatedFrom,
  TimeEntryFilters,
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

export async function createTimeEntryServer(
  admin: AdminClient,
  actor: UserProfile,
  input: CreateTimeEntryInput,
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

  const clientId = await resolveClientIdFromProject(admin, input.projectId, input.clientId);
  const costRateSnapshot = await loadCostRateSnapshot(admin, targetUserId);
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
    remote_work: input.remoteWork ?? false,
    delegation: input.delegation ?? false,
    cost_rate_snapshot: costRateSnapshot,
    status: "draft",
    created_from: "manual",
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

  const clientId = await resolveClientIdFromProject(admin, merged.projectId, merged.clientId);
  const billable = entryType.allowsBillable ? merged.billable : false;

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
