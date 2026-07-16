import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/auth/types";
import {
  fetchOpenKanbanTaskMirrorsForUser,
  kanbanTaskWorkItemAdapter,
} from "@/lib/my-work/source-adapters/kanban-task-adapter";
import { upsertWorkItemFromMirror, cancelOrphanedSyncedWorkItems } from "@/lib/my-work/source-adapters/sync-helpers";
import {
  mapAgreementStatus,
  mapFunctionalityTaskPriority,
  mapFunctionalityTaskStatus,
  mapInspectionStatus,
  mapResourcePlanStatusName,
  mapServiceIntakePriority,
  mapServiceIntakeStatus,
} from "@/lib/my-work/source-adapters/status-mappers";
import type { WorkItemMirrorFields } from "@/lib/my-work/source-adapters/types";
import { canManagerWorkItems } from "@/lib/my-work/permissions";
import {
  cancelMisassignedProcessItemWorkItemsForUser,
  syncProcessItemsToWorkItemsServer,
} from "@/lib/supabase/process-work-item-sync-server";

type AdminClient = SupabaseClient;

let completedPlanStatusId: string | null | undefined;

async function getCompletedPlanStatusId(admin: AdminClient) {
  if (completedPlanStatusId !== undefined) {
    return completedPlanStatusId;
  }
  const { data } = await admin
    .from("resource_dictionary_items")
    .select("id")
    .eq("dictionary_key", "plan_status")
    .eq("name", "Zakończone")
    .maybeSingle();
  completedPlanStatusId = data?.id ?? null;
  return completedPlanStatusId;
}

export async function syncKanbanTasksToWorkItems(admin: AdminClient, userId: string, managerId: string | null) {
  const mirrors = await fetchOpenKanbanTaskMirrorsForUser(admin, userId);

  await Promise.all(
    mirrors.map(({ sourceId, mirror }) => {
      const status = kanbanTaskWorkItemAdapter.inferInitialStatus?.(mirror) ?? "in_progress";
      return upsertWorkItemFromMirror(admin, {
        sourceType: "kanban_task",
        sourceId,
        assignedUserId: userId,
        managerId,
        mirror,
        status,
      });
    }),
  );

  const { data: staleItems, error: staleError } = await admin
    .from("work_items")
    .select("id, source_id")
    .eq("assigned_user_id", userId)
    .eq("source_type", "kanban_task")
    .neq("status", "cancelled");

  if (staleError) {
    throw new Error(staleError.message);
  }

  if (!staleItems?.length) {
    return;
  }

  const sourceIds = staleItems.map((row) => row.source_id as string);
  const { data: sourceRows, error: sourceError } = await admin
    .from("process_kanban_tasks")
    .select("id, assignee_id, closed_at")
    .in("id", sourceIds);

  if (sourceError) {
    throw new Error(sourceError.message);
  }

  const sourceById = new Map((sourceRows ?? []).map((row) => [row.id as string, row]));
  const now = new Date().toISOString();
  const orphanIds = staleItems
    .filter((item) => {
      const source = sourceById.get(item.source_id as string);
      return !source || source.assignee_id !== userId || source.closed_at;
    })
    .map((item) => item.id as string);

  if (!orphanIds.length) {
    return;
  }

  const { error: cancelError } = await admin
    .from("work_items")
    .update({ status: "cancelled", updated_at: now })
    .in("id", orphanIds);

  if (cancelError) {
    throw new Error(cancelError.message);
  }
}

export async function syncProcessItemsToWorkItems(admin: AdminClient, userId: string, managerId: string | null) {
  await syncProcessItemsToWorkItemsServer(admin, userId, managerId);
  await cancelMisassignedProcessItemWorkItemsForUser(admin, userId);
}

export async function syncServiceIntakesToWorkItems(admin: AdminClient, userId: string, managerId: string | null) {
  const { data, error } = await admin
    .from("service_intake_requests")
    .select("id, reference_number, contact_full_name, description, status, priority, due_at, project_id, client_id, assignee_id")
    .eq("assignee_id", userId)
    .is("closed_at", null)
    .in("status", ["new", "in_review"]);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const mirror: WorkItemMirrorFields = {
      title: `${row.reference_number} — ${row.contact_full_name}`,
      description: row.description as string,
      dueDate: row.due_at ? String(row.due_at).slice(0, 10) : null,
      priority: mapServiceIntakePriority(row.priority as string | null),
      projectId: row.project_id as string | null,
      clientId: row.client_id as string | null,
      assignedUserId: userId,
    };
    await upsertWorkItemFromMirror(admin, {
      sourceType: "service_intake",
      sourceId: row.id as string,
      assignedUserId: userId,
      managerId,
      mirror,
      status: mapServiceIntakeStatus(row.status as string),
    });
  }
}

export async function syncAgreementsToWorkItems(admin: AdminClient, userId: string, managerId: string | null) {
  const { data: agreements, error } = await admin
    .from("project_client_agreements")
    .select("id, project_id, title, body, status, active_version_id, responsible_user_id")
    .eq("responsible_user_id", userId)
    .eq("status", "pending_client")
    .not("active_version_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const rows = agreements ?? [];
  if (!rows.length) {
    return;
  }

  const agreementIds = rows.map((row) => row.id as string);
  const versionIds = rows.map((row) => row.active_version_id as string);
  const projectIds = [...new Set(rows.map((row) => row.project_id as string))];

  const [{ data: roles }, { data: approvals }, { data: projects }] = await Promise.all([
    admin
      .from("project_agreement_approver_roles")
      .select("id, agreement_id, is_required, is_team_role")
      .in("agreement_id", agreementIds),
    admin
      .from("project_agreement_approvals")
      .select("version_id, role_id, status")
      .in("version_id", versionIds),
    admin.from("projects").select("id, client_id").in("id", projectIds),
  ]);

  const clientByProject = new Map((projects ?? []).map((row) => [row.id as string, row.client_id as string | null]));
  const rolesByAgreement = new Map<string, typeof roles>();
  for (const role of roles ?? []) {
    const list = rolesByAgreement.get(role.agreement_id as string) ?? [];
    list.push(role);
    rolesByAgreement.set(role.agreement_id as string, list);
  }
  const approvalByVersionRole = new Map<string, string>();
  for (const approval of approvals ?? []) {
    approvalByVersionRole.set(`${approval.version_id}:${approval.role_id}`, approval.status as string);
  }

  for (const row of rows) {
    const agreementRoles = rolesByAgreement.get(row.id as string) ?? [];
    const needsTeamApproval = agreementRoles.some((role) => {
      if (!role.is_required || !role.is_team_role) {
        return false;
      }
      const status = approvalByVersionRole.get(`${row.active_version_id}:${role.id}`) ?? "pending";
      return status === "pending";
    });
    if (!needsTeamApproval) {
      continue;
    }

    const mirror: WorkItemMirrorFields = {
      title: row.title as string,
      description: row.body as string,
      projectId: row.project_id as string,
      clientId: clientByProject.get(row.project_id as string) ?? null,
      assignedUserId: userId,
    };
    await upsertWorkItemFromMirror(admin, {
      sourceType: "project_agreement",
      sourceId: row.id as string,
      assignedUserId: userId,
      managerId,
      mirror,
      status: mapAgreementStatus(row.status as string),
    });
  }
}

export async function syncInspectionsToWorkItems(admin: AdminClient, userId: string, managerId: string | null) {
  const { data, error } = await admin
    .from("inspections")
    .select(
      "id, title, work_scope, status, preliminary_date, confirmed_date, project_id, client_id, assignee_id, responsible_id, completed_at",
    )
    .or(`assignee_id.eq.${userId},responsible_id.eq.${userId}`)
    .neq("status", "completed")
    .is("completed_at", null);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const assigneeId = (row.assignee_id as string | null) === userId ? userId : userId;
    const dueDate = (row.confirmed_date ?? row.preliminary_date) as string | null;
    const mirror: WorkItemMirrorFields = {
      title: row.title as string,
      description: row.work_scope as string,
      dueDate,
      projectId: row.project_id as string | null,
      clientId: row.client_id as string,
      assignedUserId: assigneeId,
    };
    await upsertWorkItemFromMirror(admin, {
      sourceType: "inspection",
      sourceId: row.id as string,
      assignedUserId: assigneeId,
      managerId,
      mirror,
      status: mapInspectionStatus(row.status as string),
    });
  }
}

export async function syncResourcePlanItemsToWorkItems(admin: AdminClient, userId: string, managerId: string | null) {
  const completedStatusId = await getCompletedPlanStatusId(admin);

  const { data: assigneeRows, error: assigneeError } = await admin
    .from("resource_plan_items")
    .select("id, title, notes, start_at, end_at, project_id, client_id, assignee_id, status_item_id")
    .eq("assignee_id", userId);

  if (assigneeError) {
    throw new Error(assigneeError.message);
  }

  const { data: participantLinks, error: participantError } = await admin
    .from("resource_plan_item_participants")
    .select("plan_item_id")
    .eq("user_id", userId);

  if (participantError) {
    throw new Error(participantError.message);
  }

  const participantItemIds = (participantLinks ?? []).map((row) => row.plan_item_id as string);
  let participantRows: typeof assigneeRows = [];
  if (participantItemIds.length) {
    const { data, error } = await admin
      .from("resource_plan_items")
      .select("id, title, notes, start_at, end_at, project_id, client_id, assignee_id, status_item_id")
      .in("id", participantItemIds);
    if (error) {
      throw new Error(error.message);
    }
    participantRows = data ?? [];
  }

  const merged = new Map<string, (typeof assigneeRows)[number]>();
  for (const row of [...(assigneeRows ?? []), ...participantRows]) {
    merged.set(row.id as string, row);
  }

  const statusIds = [...new Set([...merged.values()].map((row) => row.status_item_id as string | null).filter(Boolean))];
  const statusNameById = new Map<string, string>();
  if (statusIds.length) {
    const { data: statuses } = await admin
      .from("resource_dictionary_items")
      .select("id, name")
      .in("id", statusIds as string[]);
    for (const status of statuses ?? []) {
      statusNameById.set(status.id as string, status.name as string);
    }
  }

  for (const row of merged.values()) {
    const statusName = row.status_item_id ? statusNameById.get(row.status_item_id as string) : null;
    const isCompleted = Boolean(completedStatusId && row.status_item_id === completedStatusId);

    if (isCompleted) {
      const now = new Date().toISOString();
      const { error: completeError } = await admin
        .from("work_items")
        .update({
          status: "verified",
          completed_at: now,
          verified_at: now,
          updated_at: now,
        })
        .eq("source_type", "resource_plan_item")
        .eq("source_id", row.id as string)
        .eq("assigned_user_id", userId);
      if (completeError) {
        throw new Error(completeError.message);
      }
      continue;
    }

    const mirror: WorkItemMirrorFields = {
      title: row.title as string,
      description: row.notes as string,
      dueDate: row.end_at ? String(row.end_at).slice(0, 10) : null,
      projectId: row.project_id as string | null,
      clientId: row.client_id as string | null,
      assignedUserId: userId,
    };
    await upsertWorkItemFromMirror(admin, {
      sourceType: "resource_plan_item",
      sourceId: row.id as string,
      assignedUserId: userId,
      managerId,
      mirror,
      status: mapResourcePlanStatusName(statusName),
    });
  }
}

export async function syncFunctionalityTasksToWorkItems(admin: AdminClient, userId: string, managerId: string | null) {
  const { data, error } = await admin
    .from("project_functionality_tasks")
    .select("id, title, description, status, priority, assignee_id, survey_id")
    .eq("assignee_id", userId)
    .neq("status", "done");

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (!rows.length) {
    return;
  }

  const surveyIds = [...new Set(rows.map((row) => row.survey_id as string))];
  const { data: surveys } = await admin
    .from("project_functionality_surveys")
    .select("id, project_id, status")
    .in("id", surveyIds);

  const surveyById = new Map((surveys ?? []).map((row) => [row.id as string, row]));
  const projectIds = [...new Set((surveys ?? []).map((row) => row.project_id as string))];
  const { data: projects } = projectIds.length
    ? await admin.from("projects").select("id, client_id").in("id", projectIds)
    : { data: [] };
  const clientByProject = new Map((projects ?? []).map((row) => [row.id as string, row.client_id as string | null]));

  for (const row of rows) {
    const survey = surveyById.get(row.survey_id as string);
    if (!survey || survey.status === "completed") {
      continue;
    }
    const mirror: WorkItemMirrorFields = {
      title: row.title as string,
      description: row.description as string,
      projectId: survey.project_id as string,
      clientId: clientByProject.get(survey.project_id as string) ?? null,
      priority: mapFunctionalityTaskPriority(row.priority as string),
      assignedUserId: userId,
    };
    await upsertWorkItemFromMirror(admin, {
      sourceType: "functionality_task",
      sourceId: row.id as string,
      assignedUserId: userId,
      managerId,
      mirror,
      status: mapFunctionalityTaskStatus(row.status as string),
    });
  }
}

export async function syncAllWorkItemSources(
  admin: AdminClient,
  userId: string,
  profile: UserProfile,
) {
  const managerId = canManagerWorkItems(profile.role) ? userId : null;
  await Promise.all([
    syncKanbanTasksToWorkItems(admin, userId, managerId),
    syncProcessItemsToWorkItems(admin, userId, managerId),
    syncServiceIntakesToWorkItems(admin, userId, managerId),
    syncInspectionsToWorkItems(admin, userId, managerId),
    syncResourcePlanItemsToWorkItems(admin, userId, managerId),
    syncFunctionalityTasksToWorkItems(admin, userId, managerId),
    syncAgreementsToWorkItems(admin, userId, managerId),
  ]);
  await cancelOrphanedSyncedWorkItems(admin, userId);
}
