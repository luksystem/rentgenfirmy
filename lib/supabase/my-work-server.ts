import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserDisplayName, STAFF_ROLES, type UserProfile } from "@/lib/auth/types";
import { canDeleteWorkItem, canEditWorkItem, canManagerWorkItems } from "@/lib/my-work/permissions";
import { getWorkItemSourceAdapter } from "@/lib/my-work/source-adapters/registry";
import { syncAllWorkItemSources } from "@/lib/supabase/my-work-sync";
import {
  acceptanceActionToStatus,
  completeOutcomeToStatus,
  type CreateWorkItemInput,
  type WorkItem,
  type WorkItemAcceptance,
  type WorkItemAcceptanceAction,
  type WorkItemAcceptanceInput,
  type WorkItemComment,
  type WorkItemCompleteInput,
  type WorkItemDetail,
  type WorkItemLog,
  type WorkItemPriority,
  type WorkItemSourceTypeMeta,
  type WorkItemStatus,
  type WorkItemView,
  type UpdateWorkItemInput,
  isTerminalWorkItemStatus,
  workItemLinkUrl,
} from "@/lib/my-work/types";
import { assertWorkItemStatusTransition } from "@/lib/my-work/state-machine";
import { resolveSourceLinkForItem } from "@/lib/my-work/link-resolver";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { assertAssigneeHasProjectAccessServer } from "@/lib/supabase/project-access-server";
import { awardXpServer } from "@/lib/supabase/xp-server";
import type { WorkItemPatch } from "@/lib/my-work/source-adapters/types";

type AdminClient = SupabaseClient;

async function fetchActiveTeamMemberIds(admin: AdminClient) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("is_active", true)
    .in("role", [...STAFF_ROLES]);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => row.id as string);
}

async function syncWorkItemPatchToSource(
  admin: AdminClient,
  item: WorkItem,
  patch: WorkItemPatch,
) {
  if (item.sourceType === "manual" || !item.sourceId) {
    return;
  }
  const adapter = getWorkItemSourceAdapter(item.sourceType);
  if (adapter) {
    await adapter.syncToSource(admin, item, patch);
  }
}

type WorkItemRow = {
  id: string;
  source_type: string;
  source_id: string | null;
  project_id: string | null;
  client_id: string | null;
  process_stage_id: string | null;
  assigned_user_id: string;
  created_by_id: string | null;
  manager_id: string | null;
  parent_work_item_id: string | null;
  title: string;
  description: string;
  expected_result: string;
  completion_criteria: string;
  required_materials: string;
  required_info: string;
  dependencies: unknown;
  planned_start: string | null;
  planned_end: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  priority: string;
  status: string;
  blocked_reason: string;
  sent_at: string | null;
  last_acceptance_at: string | null;
  accepted_without_reservations: boolean;
  completed_at: string | null;
  verified_at: string | null;
  verified_by_id: string | null;
  ai_generated: boolean;
  ai_suggestion_reason: string;
  created_at: string;
  updated_at: string;
};

function parseDependencies(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

export function mapWorkItemRow(
  row: WorkItemRow,
  supportingUserIds: string[] = [],
): WorkItem {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    projectId: row.project_id,
    clientId: row.client_id,
    processStageId: row.process_stage_id,
    assignedUserId: row.assigned_user_id,
    createdById: row.created_by_id,
    managerId: row.manager_id,
    parentWorkItemId: row.parent_work_item_id,
    title: row.title,
    description: row.description,
    expectedResult: row.expected_result,
    completionCriteria: row.completion_criteria,
    requiredMaterials: row.required_materials,
    requiredInfo: row.required_info,
    dependencies: parseDependencies(row.dependencies),
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    dueDate: row.due_date,
    estimatedMinutes: row.estimated_minutes,
    priority: row.priority as WorkItemPriority,
    status: row.status as WorkItemStatus,
    blockedReason: row.blocked_reason,
    sentAt: row.sent_at,
    lastAcceptanceAt: row.last_acceptance_at,
    acceptedWithoutReservations: row.accepted_without_reservations,
    completedAt: row.completed_at,
    verifiedAt: row.verified_at,
    verifiedById: row.verified_by_id,
    aiGenerated: row.ai_generated,
    aiSuggestionReason: row.ai_suggestion_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    supportingUserIds,
  };
}

function mapCommentRow(row: {
  id: string;
  work_item_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
}): WorkItemComment {
  return {
    id: row.id,
    workItemId: row.work_item_id,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapLogRow(row: {
  id: string;
  work_item_id: string;
  user_id: string | null;
  action: string;
  metadata: unknown;
  created_at: string;
}): WorkItemLog {
  return {
    id: row.id,
    workItemId: row.work_item_id,
    userId: row.user_id,
    action: row.action,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  };
}

function mapAcceptanceRow(row: {
  id: string;
  work_item_id: string;
  user_id: string;
  action: string;
  comment: string;
  due_date_at_acceptance: string | null;
  accepted_without_reservations: boolean;
  created_at: string;
}): WorkItemAcceptance {
  return {
    id: row.id,
    workItemId: row.work_item_id,
    userId: row.user_id,
    action: row.action as WorkItemAcceptanceAction,
    comment: row.comment,
    dueDateAtAcceptance: row.due_date_at_acceptance,
    acceptedWithoutReservations: row.accepted_without_reservations,
    createdAt: row.created_at,
  };
}

export function canManageWorkItems(profile: UserProfile) {
  return canManagerWorkItems(profile.role);
}

export { canDeleteWorkItem, canEditWorkItem };

export async function canViewWorkItem(
  admin: AdminClient,
  item: WorkItem,
  userId: string,
  profile: UserProfile,
) {
  if (canManageWorkItems(profile)) {
    return true;
  }
  if (item.assignedUserId === userId) {
    return true;
  }
  if (item.supportingUserIds.includes(userId)) {
    return true;
  }
  if (item.managerId === userId) {
    return true;
  }
  const { data } = await admin.from("profiles").select("supervisor_id").eq("id", item.assignedUserId).maybeSingle();
  return data?.supervisor_id === userId;
}

export async function appendWorkItemLog(
  admin: AdminClient,
  input: {
    workItemId: string;
    userId: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("work_item_logs").insert({
    id: crypto.randomUUID(),
    work_item_id: input.workItemId,
    user_id: input.userId,
    action: input.action,
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function fetchSupportingMap(admin: AdminClient, itemIds: string[]) {
  const map = new Map<string, string[]>();
  if (!itemIds.length) {
    return map;
  }
  const { data, error } = await admin
    .from("work_item_supporting_users")
    .select("work_item_id, user_id")
    .in("work_item_id", itemIds);
  if (error) {
    throw new Error(error.message);
  }
  for (const row of data ?? []) {
    const list = map.get(row.work_item_id) ?? [];
    list.push(row.user_id);
    map.set(row.work_item_id, list);
  }
  return map;
}

async function fetchSourceTypeMap(admin: AdminClient) {
  const { data, error } = await admin.from("work_item_source_types").select("*").eq("is_active", true);
  if (error) {
    throw new Error(error.message);
  }
  const map = new Map<string, WorkItemSourceTypeMeta>();
  for (const row of data ?? []) {
    map.set(row.code, {
      code: row.code,
      label: row.label,
      moduleLabel: row.module_label,
      icon: row.icon,
    });
  }
  return map;
}

async function enrichWorkItems(
  admin: AdminClient,
  items: WorkItem[],
  currentUserId: string,
): Promise<WorkItemView[]> {
  if (!items.length) {
    return [];
  }

  const projectIds = [...new Set(items.map((i) => i.projectId).filter(Boolean))] as string[];
  const clientIds = [...new Set(items.map((i) => i.clientId).filter(Boolean))] as string[];
  const profileIds = [
    ...new Set(items.flatMap((i) => [i.assignedUserId, i.managerId, i.createdById].filter(Boolean))),
  ] as string[];

  const [sourceTypes, projectsRes, clientsRes, profilesRes, commentsRes] = await Promise.all([
    fetchSourceTypeMap(admin),
    projectIds.length
      ? admin.from("projects").select("id, name, stage").in("id", projectIds)
      : Promise.resolve({ data: [], error: null }),
    clientIds.length
      ? admin.from("clients").select("id, first_name, last_name").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? admin.from("profiles").select("*").in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("work_item_comments")
      .select("work_item_id")
      .in(
        "work_item_id",
        items.map((i) => i.id),
      ),
  ]);

  const projectMap = new Map((projectsRes.data ?? []).map((p) => [p.id, p.name as string]));
  const clientMap = new Map(
    (clientsRes.data ?? []).map((c) => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "Klient",
    ]),
  );
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, getUserDisplayName(mapProfileRow(p))]));

  const commentCounts = new Map<string, number>();
  for (const row of commentsRes.data ?? []) {
    commentCounts.set(row.work_item_id, (commentCounts.get(row.work_item_id) ?? 0) + 1);
  }

  return items.map((item) => ({
    ...item,
    sourceTypeMeta: sourceTypes.get(item.sourceType) ?? null,
    projectName: item.projectId ? (projectMap.get(item.projectId) ?? null) : null,
    clientName: item.clientId ? (clientMap.get(item.clientId) ?? null) : null,
    stageTitle: null,
    managerName: item.managerId ? (profileMap.get(item.managerId) ?? null) : null,
    assignedUserName: profileMap.get(item.assignedUserId) ?? null,
    commentCount: commentCounts.get(item.id) ?? 0,
    unreadCommentCount: 0,
    sourceLinkUrl: resolveSourceLinkForItem(item),
    myWorkLinkUrl: workItemLinkUrl(item.id),
    isSupporting: item.supportingUserIds.includes(currentUserId) && item.assignedUserId !== currentUserId,
  }));
}

export async function fetchWorkItemsForUser(
  admin: AdminClient,
  userId: string,
  profile: UserProfile,
  options?: { scope?: "my" | "team"; assignedUserId?: string | null; syncKanban?: boolean },
): Promise<WorkItemView[]> {
  const scope = options?.scope ?? "my";

  if (options?.syncKanban !== false) {
    if (scope === "team" && canManageWorkItems(profile)) {
      const syncUserIds = options?.assignedUserId
        ? [options.assignedUserId]
        : await fetchActiveTeamMemberIds(admin);
      await Promise.all(
        syncUserIds.map((syncUserId) => syncAllWorkItemSources(admin, syncUserId, profile)),
      );
    } else {
      await syncAllWorkItemSources(admin, userId, profile);
    }
  }

  let query = admin.from("work_items").select("*");

  if (scope === "team" && canManageWorkItems(profile)) {
    if (options?.assignedUserId) {
      query = query.eq("assigned_user_id", options.assignedUserId);
    }
  } else {
    const { data: supportingRows } = await admin
      .from("work_item_supporting_users")
      .select("work_item_id")
      .eq("user_id", userId);
    const supportingIds = (supportingRows ?? []).map((r) => r.work_item_id);

    if (supportingIds.length) {
      query = query.or(`assigned_user_id.eq.${userId},id.in.(${supportingIds.join(",")})`);
    } else {
      query = query.eq("assigned_user_id", userId);
    }
  }

  const { data, error } = await query
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  let rows = (data ?? []) as WorkItemRow[];
  if (!canManageWorkItems(profile)) {
    rows = rows.filter((row) => row.status !== "cancelled");
  }

  const supportingMap = await fetchSupportingMap(
    admin,
    rows.map((r) => r.id),
  );
  const items = rows.map((row) => mapWorkItemRow(row, supportingMap.get(row.id) ?? []));
  return enrichWorkItems(admin, items, userId);
}

export async function fetchWorkItemDetail(
  admin: AdminClient,
  id: string,
  userId: string,
  profile: UserProfile,
): Promise<WorkItemDetail | null> {
  const { data, error } = await admin.from("work_items").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const supportingMap = await fetchSupportingMap(admin, [id]);
  const item = mapWorkItemRow(data as WorkItemRow, supportingMap.get(id) ?? []);

  if (!(await canViewWorkItem(admin, item, userId, profile))) {
    throw new Error("Brak uprawnień do tego zadania.");
  }

  const [commentsRes, logsRes, acceptancesRes, views] = await Promise.all([
    admin.from("work_item_comments").select("*").eq("work_item_id", id).order("created_at"),
    admin.from("work_item_logs").select("*").eq("work_item_id", id).order("created_at", { ascending: false }),
    admin.from("work_item_acceptances").select("*").eq("work_item_id", id).order("created_at", { ascending: false }),
    enrichWorkItems(admin, [item], userId),
  ]);

  return {
    item: views[0]!,
    comments: (commentsRes.data ?? []).map(mapCommentRow),
    logs: (logsRes.data ?? []).map(mapLogRow),
    acceptances: (acceptancesRes.data ?? []).map(mapAcceptanceRow),
  };
}

export async function createManualWorkItemServer(
  admin: AdminClient,
  input: CreateWorkItemInput,
  actor: UserProfile,
) {
  if (!canManageWorkItems(actor)) {
    throw new Error("Tylko manager lub administrator może tworzyć zadania.");
  }

  const projectId = input.projectId ?? null;
  await assertAssigneeHasProjectAccessServer(admin, input.assignedUserId, projectId);

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const status: WorkItemStatus = input.sendImmediately ? "pending_ack" : "draft";

  const { error } = await admin.from("work_items").insert({
    id,
    source_type: "manual",
    source_id: null,
    project_id: input.projectId ?? null,
    client_id: input.clientId ?? null,
    process_stage_id: input.processStageId ?? null,
    assigned_user_id: input.assignedUserId,
    created_by_id: actor.id,
    manager_id: actor.id,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    expected_result: input.expectedResult?.trim() ?? "",
    completion_criteria: input.completionCriteria?.trim() ?? "",
    required_materials: input.requiredMaterials?.trim() ?? "",
    required_info: input.requiredInfo?.trim() ?? "",
    due_date: input.dueDate ?? null,
    planned_start: input.plannedStart ?? null,
    planned_end: input.plannedEnd ?? null,
    estimated_minutes: input.estimatedMinutes ?? null,
    priority: input.priority ?? "normal",
    status,
    sent_at: input.sendImmediately ? now : null,
    ai_generated: input.aiGenerated ?? false,
    ai_suggestion_reason: input.aiSuggestionReason?.trim() ?? "",
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (input.supportingUserIds?.length) {
    const rows = input.supportingUserIds.map((userId) => ({
      work_item_id: id,
      user_id: userId,
    }));
    await admin.from("work_item_supporting_users").insert(rows);
  }

  await appendWorkItemLog(admin, {
    workItemId: id,
    userId: actor.id,
    action: input.sendImmediately ? "created_and_sent" : "created",
  });

  const detail = await fetchWorkItemDetail(admin, id, actor.id, actor);
  return detail!.item;
}

export async function updateWorkItemServer(
  admin: AdminClient,
  id: string,
  input: UpdateWorkItemInput,
  actor: UserProfile,
) {
  const detail = await fetchWorkItemDetail(admin, id, actor.id, actor);
  if (!detail) {
    throw new Error("Nie znaleziono zadania.");
  }

  const item = detail.item;
  if (!canEditWorkItem(actor, item)) {
    throw new Error("Brak uprawnień do edycji tego zadania.");
  }

  const now = new Date().toISOString();
  const isManual = item.sourceType === "manual";
  const updatePayload: Record<string, unknown> = { updated_at: now };
  const changedFields: string[] = [];

  if (input.title !== undefined && input.title.trim()) {
    updatePayload.title = input.title.trim();
    changedFields.push("title");
  }
  if (input.description !== undefined) {
    updatePayload.description = input.description.trim();
    changedFields.push("description");
  }
  if (input.dueDate !== undefined) {
    updatePayload.due_date = input.dueDate;
    changedFields.push("due_date");
  }
  if (input.plannedStart !== undefined) {
    updatePayload.planned_start = input.plannedStart;
    changedFields.push("planned_start");
  }
  if (input.plannedEnd !== undefined) {
    updatePayload.planned_end = input.plannedEnd;
    changedFields.push("planned_end");
  }
  if (input.estimatedMinutes !== undefined) {
    updatePayload.estimated_minutes = input.estimatedMinutes;
    changedFields.push("estimated_minutes");
  }
  if (input.priority !== undefined) {
    updatePayload.priority = input.priority;
    changedFields.push("priority");
  }
  if (input.assignedUserId !== undefined) {
    updatePayload.assigned_user_id = input.assignedUserId;
    changedFields.push("assigned_user_id");
  }
  if (input.projectId !== undefined) {
    updatePayload.project_id = input.projectId;
    changedFields.push("project_id");
  }
  if (input.clientId !== undefined) {
    updatePayload.client_id = input.clientId;
    changedFields.push("client_id");
  }
  if (input.processStageId !== undefined) {
    updatePayload.process_stage_id = input.processStageId;
    changedFields.push("process_stage_id");
  }

  if (isManual) {
    if (input.expectedResult !== undefined) {
      updatePayload.expected_result = input.expectedResult.trim();
      changedFields.push("expected_result");
    }
    if (input.completionCriteria !== undefined) {
      updatePayload.completion_criteria = input.completionCriteria.trim();
      changedFields.push("completion_criteria");
    }
    if (input.requiredMaterials !== undefined) {
      updatePayload.required_materials = input.requiredMaterials.trim();
      changedFields.push("required_materials");
    }
    if (input.requiredInfo !== undefined) {
      updatePayload.required_info = input.requiredInfo.trim();
      changedFields.push("required_info");
    }
  }

  if (input.status !== undefined && input.status !== item.status) {
    assertWorkItemStatusTransition(item.status, input.status);
    updatePayload.status = input.status;
    changedFields.push("status");
  }

  if (changedFields.length === 0 && input.supportingUserIds === undefined) {
    throw new Error("Brak pól do aktualizacji.");
  }

  const nextProjectId =
    input.projectId !== undefined ? input.projectId : item.projectId;
  const nextAssigneeId =
    input.assignedUserId !== undefined ? input.assignedUserId : item.assignedUserId;
  await assertAssigneeHasProjectAccessServer(admin, nextAssigneeId, nextProjectId);

  if (changedFields.length > 0) {
    const { error } = await admin.from("work_items").update(updatePayload).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }

  if (input.supportingUserIds !== undefined && isManual) {
    await admin.from("work_item_supporting_users").delete().eq("work_item_id", id);
    if (input.supportingUserIds.length) {
      await admin.from("work_item_supporting_users").insert(
        input.supportingUserIds.map((userId) => ({
          work_item_id: id,
          user_id: userId,
        })),
      );
    }
    changedFields.push("supporting_users");
  }

  if (item.sourceType !== "manual" && item.sourceId) {
    await syncWorkItemPatchToSource(admin, item, {
      ...mapUpdateInputToWorkItemPatch(input),
      status: input.status ?? item.status,
    });
  }

  await appendWorkItemLog(admin, {
    workItemId: id,
    userId: actor.id,
    action: "updated",
    metadata: { fields: changedFields },
  });

  return fetchWorkItemDetail(admin, id, actor.id, actor);
}

function mapUpdateInputToWorkItemPatch(input: UpdateWorkItemInput) {
  return {
    title: input.title,
    description: input.description,
    dueDate: input.dueDate,
    priority: input.priority,
    assignedUserId: input.assignedUserId,
    projectId: input.projectId,
    clientId: input.clientId,
    processStageId: input.processStageId,
    status: input.status,
  };
}

export async function deleteWorkItemServer(
  admin: AdminClient,
  id: string,
  actor: UserProfile,
  options?: { hard?: boolean },
) {
  const detail = await fetchWorkItemDetail(admin, id, actor.id, actor);
  if (!detail) {
    throw new Error("Nie znaleziono zadania.");
  }

  const item = detail.item;
  if (!canDeleteWorkItem(actor, item)) {
    throw new Error("Brak uprawnień do usunięcia tego zadania.");
  }

  const hardDeleteAllowed =
    options?.hard === true &&
    actor.role === "administrator" &&
    item.sourceType === "manual" &&
    (item.status === "draft" || item.status === "cancelled");

  if (hardDeleteAllowed) {
    const { error } = await admin.from("work_items").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
    return { deleted: true, hard: true };
  }

  if (isTerminalWorkItemStatus(item.status)) {
    throw new Error("Nie można anulować zadania w tym statusie.");
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("work_items")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  await appendWorkItemLog(admin, {
    workItemId: id,
    userId: actor.id,
    action: "cancelled",
  });

  return { deleted: true, hard: false };
}

export async function sendWorkItemServer(admin: AdminClient, id: string, actor: UserProfile) {
  if (!canManageWorkItems(actor)) {
    throw new Error("Brak uprawnień.");
  }
  const detail = await fetchWorkItemDetail(admin, id, actor.id, actor);
  if (!detail) {
    throw new Error("Nie znaleziono zadania.");
  }

  const now = new Date().toISOString();
  assertWorkItemStatusTransition(detail.item.status, "pending_ack");

  const { error } = await admin
    .from("work_items")
    .update({ status: "pending_ack", sent_at: now, updated_at: now })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await appendWorkItemLog(admin, { workItemId: id, userId: actor.id, action: "sent" });
  return fetchWorkItemDetail(admin, id, actor.id, actor);
}

export async function recordWorkItemAcceptanceServer(
  admin: AdminClient,
  id: string,
  input: WorkItemAcceptanceInput,
  actor: UserProfile,
) {
  const detail = await fetchWorkItemDetail(admin, id, actor.id, actor);
  if (!detail) {
    throw new Error("Nie znaleziono zadania.");
  }

  if (detail.item.assignedUserId !== actor.id) {
    throw new Error("Tylko osoba przypisana może przyjąć zadanie.");
  }

  const newStatus = acceptanceActionToStatus(input.action);
  assertWorkItemStatusTransition(detail.item.status, newStatus);
  const now = new Date().toISOString();

  await admin.from("work_item_acceptances").insert({
    id: crypto.randomUUID(),
    work_item_id: id,
    user_id: actor.id,
    action: input.action,
    comment: input.comment?.trim() ?? "",
    due_date_at_acceptance: detail.item.dueDate,
    accepted_without_reservations: input.acceptedWithoutReservations ?? input.action === "accept",
    created_at: now,
  });

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    last_acceptance_at: now,
    accepted_without_reservations: input.acceptedWithoutReservations ?? input.action === "accept",
    updated_at: now,
  };

  if (input.action === "propose_reschedule" && input.proposedDueDate) {
    updatePayload.blocked_reason = `Propozycja terminu: ${input.proposedDueDate}. ${input.comment ?? ""}`.trim();
  } else if (input.action === "report_risk" || input.action === "report_shortage") {
    updatePayload.blocked_reason = input.comment?.trim() ?? "";
  }

  const { error } = await admin.from("work_items").update(updatePayload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  await syncWorkItemPatchToSource(admin, detail.item, { status: newStatus });

  await appendWorkItemLog(admin, {
    workItemId: id,
    userId: actor.id,
    action: `acceptance:${input.action}`,
    metadata: { comment: input.comment ?? "" },
  });

  if (input.acceptedWithoutReservations ?? input.action === "accept") {
    await awardXpServer(admin, {
      employeeId: actor.id,
      criterionKey: "task_accepted_without_reservations",
      sourceId: id,
    });
  }

  return fetchWorkItemDetail(admin, id, actor.id, actor);
}

export async function completeWorkItemServer(
  admin: AdminClient,
  id: string,
  input: WorkItemCompleteInput,
  actor: UserProfile,
) {
  const detail = await fetchWorkItemDetail(admin, id, actor.id, actor);
  if (!detail) {
    throw new Error("Nie znaleziono zadania.");
  }

  if (detail.item.assignedUserId !== actor.id && !canManageWorkItems(actor)) {
    throw new Error("Brak uprawnień.");
  }

  if (input.outcome !== "done" && !input.comment?.trim()) {
    throw new Error("Komentarz jest wymagany dla tego statusu zakończenia.");
  }

  const newStatus = completeOutcomeToStatus(input.outcome);
  assertWorkItemStatusTransition(detail.item.status, newStatus);
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };

  if (input.outcome === "done" || input.outcome === "partial") {
    updatePayload.completed_at = now;
  }
  if (input.outcome === "blocked") {
    updatePayload.blocked_reason = input.comment?.trim() ?? "";
  }

  const { error } = await admin.from("work_items").update(updatePayload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  await syncWorkItemPatchToSource(admin, detail.item, {
    status: newStatus,
    completedAt: input.outcome === "done" ? now : null,
  });

  await appendWorkItemLog(admin, {
    workItemId: id,
    userId: actor.id,
    action: `complete:${input.outcome}`,
    metadata: {
      comment: input.comment ?? "",
      workDescription: input.workDescription ?? "",
      continuationNote: input.continuationNote ?? "",
    },
  });

  if (input.comment?.trim()) {
    await admin.from("work_item_comments").insert({
      id: crypto.randomUUID(),
      work_item_id: id,
      author_id: actor.id,
      author_name: getUserDisplayName(actor),
      body: input.comment.trim(),
      created_at: now,
    });
  }

  return fetchWorkItemDetail(admin, id, actor.id, actor);
}

export async function verifyWorkItemServer(admin: AdminClient, id: string, actor: UserProfile) {
  if (!canManageWorkItems(actor)) {
    throw new Error("Tylko manager może zatwierdzić wykonanie.");
  }

  const detail = await fetchWorkItemDetail(admin, id, actor.id, actor);
  if (!detail) {
    throw new Error("Nie znaleziono zadania.");
  }

  assertWorkItemStatusTransition(detail.item.status, "verified");
  const now = new Date().toISOString();

  const { error } = await admin
    .from("work_items")
    .update({
      status: "verified",
      verified_at: now,
      verified_by_id: actor.id,
      updated_at: now,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await syncWorkItemPatchToSource(admin, detail.item, { status: "verified", completedAt: now });

  await appendWorkItemLog(admin, { workItemId: id, userId: actor.id, action: "verified" });

  const dueDate = detail.item.plannedEnd ?? detail.item.dueDate;
  if (dueDate && new Date(now) <= new Date(`${dueDate}T23:59:59`)) {
    await awardXpServer(admin, {
      employeeId: detail.item.assignedUserId,
      criterionKey: "task_completed_on_time",
      sourceId: id,
    });
  }

  return fetchWorkItemDetail(admin, id, actor.id, actor);
}

export async function updateWorkItemStatusServer(
  admin: AdminClient,
  id: string,
  status: WorkItemStatus,
  actor: UserProfile,
) {
  const detail = await fetchWorkItemDetail(admin, id, actor.id, actor);
  if (!detail) {
    throw new Error("Nie znaleziono zadania.");
  }

  const isAssignee = detail.item.assignedUserId === actor.id;
  if (!isAssignee && !canManageWorkItems(actor)) {
    throw new Error("Brak uprawnień.");
  }

  assertWorkItemStatusTransition(detail.item.status, status);
  const now = new Date().toISOString();

  const { error } = await admin.from("work_items").update({ status, updated_at: now }).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  await syncWorkItemPatchToSource(admin, detail.item, { status });

  await appendWorkItemLog(admin, { workItemId: id, userId: actor.id, action: `status:${status}` });
  return fetchWorkItemDetail(admin, id, actor.id, actor);
}

export async function addWorkItemCommentServer(
  admin: AdminClient,
  id: string,
  body: string,
  actor: UserProfile,
) {
  const detail = await fetchWorkItemDetail(admin, id, actor.id, actor);
  if (!detail) {
    throw new Error("Nie znaleziono zadania.");
  }

  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Komentarz nie może być pusty.");
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("work_item_comments").insert({
    id: crypto.randomUUID(),
    work_item_id: id,
    author_id: actor.id,
    author_name: getUserDisplayName(actor),
    body: trimmed,
    created_at: now,
  });

  if (error) {
    throw new Error(error.message);
  }

  await appendWorkItemLog(admin, { workItemId: id, userId: actor.id, action: "comment_added" });
  return fetchWorkItemDetail(admin, id, actor.id, actor);
}

export async function startWorkItemServer(admin: AdminClient, id: string, actor: UserProfile) {
  return updateWorkItemStatusServer(admin, id, "in_progress", actor);
}

export async function requestWorkItemTakeoverServer(
  admin: AdminClient,
  id: string,
  actor: UserProfile,
  comment?: string,
) {
  const detail = await fetchWorkItemDetail(admin, id, actor.id, actor);
  if (!detail) {
    throw new Error("Nie znaleziono zadania.");
  }

  if (detail.item.assignedUserId === actor.id) {
    throw new Error("To zadanie jest już przypisane do Ciebie.");
  }

  const canRequest =
    detail.item.isSupporting ||
    detail.item.supportingUserIds.includes(actor.id) ||
    canManageWorkItems(actor);

  if (!canRequest) {
    throw new Error("Brak uprawnień do prośby o przejęcie tego zadania.");
  }

  const recipientId = detail.item.managerId ?? detail.item.assignedUserId;
  await appendWorkItemLog(admin, {
    workItemId: id,
    userId: actor.id,
    action: "takeover_requested",
    metadata: { comment: comment?.trim() ?? "", recipientId },
  });

  return {
    detail,
    recipientId,
    requesterName: getUserDisplayName(actor),
  };
}

export async function completeAllocationWorkItemServer(
  admin: AdminClient,
  workItemId: string,
  actor: UserProfile,
) {
  const detail = await fetchWorkItemDetail(admin, workItemId, actor.id, actor);
  if (!detail) {
    throw new Error("Nie znaleziono zadania.");
  }
  if (detail.item.sourceType !== "resource_plan_item") {
    throw new Error("To działanie dotyczy tylko przydziałów z planowania zasobów.");
  }
  if (isTerminalWorkItemStatus(detail.item.status)) {
    throw new Error("Ten przydział jest już zakończony.");
  }

  const isAssignee = detail.item.assignedUserId === actor.id;
  const isManager = canManageWorkItems(actor);
  if (!isAssignee && !isManager) {
    throw new Error("Brak uprawnień do zakończenia tego przydziału.");
  }

  const now = new Date().toISOString();
  const targetStatus: WorkItemStatus =
    isManager && (detail.item.status === "pending_verification" || !isAssignee)
      ? "verified"
      : "pending_verification";

  const updatePayload: Record<string, unknown> = {
    status: targetStatus,
    completed_at: now,
    updated_at: now,
  };
  if (targetStatus === "verified") {
    updatePayload.verified_at = now;
    updatePayload.verified_by_id = actor.id;
  }

  const { error } = await admin.from("work_items").update(updatePayload).eq("id", workItemId);
  if (error) {
    throw new Error(error.message);
  }

  await syncWorkItemPatchToSource(admin, detail.item, {
    status: targetStatus,
    completedAt: now,
  });

  await appendWorkItemLog(admin, {
    workItemId,
    userId: actor.id,
    action: "complete:allocation",
    metadata: { targetStatus },
  });

  return fetchWorkItemDetail(admin, workItemId, actor.id, actor);
}
