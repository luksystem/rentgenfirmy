import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deriveProcessItemStatus,
  normalizeChecklistPayload,
} from "@/lib/process/item-payload";
import type { ProcessItemCompletion, ProcessItemKind, ProjectProcessItemStatus } from "@/lib/process/types";
import { getUserDisplayName } from "@/lib/auth/types";
import { mapProcessItemStatus } from "@/lib/my-work/source-adapters/status-mappers";
import {
  mapWorkItemStatusToProcessItemStatus,
  shouldClearProcessItemCompletion,
  shouldMarkProcessItemCompleted,
} from "@/lib/my-work/source-adapters/process-status-sync";
import type { WorkItemMirrorFields, WorkItemPatch } from "@/lib/my-work/source-adapters/types";
import { upsertWorkItemFromMirror } from "@/lib/my-work/source-adapters/sync-helpers";
import type { WorkItem, WorkItemStatus } from "@/lib/my-work/types";
import { isTerminalWorkItemStatus } from "@/lib/my-work/types";
import { projectProcessToUpdate, rowToProjectProcess } from "@/lib/supabase/process-mappers";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";

type AdminClient = SupabaseClient;

type ProcessItemSyncRow = {
  id: string;
  project_id: string;
  template_item_id: string;
  kind: string;
  status: string;
  assignee_id: string | null;
  payload: unknown;
  signed_at: string | null;
};

function isProcessItemKind(value: string): value is ProcessItemKind {
  return (
    value === "checklist" ||
    value === "protocol" ||
    value === "settlement" ||
    value === "kanban" ||
    value === "note"
  );
}

export function resolveEffectiveProcessItemStatus(row: ProcessItemSyncRow): ProjectProcessItemStatus {
  if (row.signed_at) {
    return "completed";
  }

  const kind = isProcessItemKind(row.kind) ? row.kind : "checklist";
  const payload = normalizeChecklistPayload(row.payload);
  const rawStatus =
    row.status === "open" || row.status === "in_progress" || row.status === "completed"
      ? row.status
      : "open";

  return deriveProcessItemStatus(kind, payload, rawStatus);
}

function resolveProcessItemTitle(
  row: ProcessItemSyncRow,
  titleByTemplate: Map<string, string>,
) {
  return titleByTemplate.get(row.template_item_id) ?? `Element procesu (${row.kind})`;
}

async function updateProjectProcessCompletionServer(
  admin: AdminClient,
  projectId: string,
  templateItemId: string,
  completed: boolean,
  completedBy?: string | null,
) {
  const { data: processRow, error } = await admin
    .from("project_processes")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!processRow) {
    return;
  }

  const process = rowToProjectProcess(processRow);
  const completions = { ...process.completions };
  if (completed) {
    completions[templateItemId] = {
      completedAt: new Date().toISOString(),
      completedBy: completedBy ?? undefined,
    } satisfies ProcessItemCompletion;
  } else {
    delete completions[templateItemId];
  }

  const updated = {
    ...process,
    completions,
    updatedAt: new Date().toISOString(),
  };

  const { error: updateError } = await admin
    .from("project_processes")
    .update(projectProcessToUpdate(updated))
    .eq("project_id", projectId);
  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function cancelProcessItemWorkItemsForOtherAssignees(
  admin: AdminClient,
  processItemId: string,
  assigneeId: string,
) {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("work_items")
    .update({ status: "cancelled", updated_at: now })
    .eq("source_type", "process_item")
    .eq("source_id", processItemId)
    .neq("assigned_user_id", assigneeId)
    .not("status", "in", '("verified","cancelled","not_done")');
  if (error) {
    throw new Error(error.message);
  }
}

async function cancelUnassignedProcessItemWorkItems(admin: AdminClient, processItemId: string) {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("work_items")
    .update({ status: "cancelled", updated_at: now })
    .eq("source_type", "process_item")
    .eq("source_id", processItemId)
    .not("status", "in", '("verified","cancelled","not_done")');
  if (error) {
    throw new Error(error.message);
  }
}

async function applyProcessItemMirrorToWorkItem(
  admin: AdminClient,
  input: {
    sourceId: string;
    assignedUserId: string;
    managerId: string | null;
    mirror: WorkItemMirrorFields;
    status: WorkItemStatus;
  },
) {
  const now = new Date().toISOString();
  const isCompleted = isTerminalWorkItemStatus(input.status) && input.status === "verified";

  const { data: existing } = await admin
    .from("work_items")
    .select("id")
    .eq("source_type", "process_item")
    .eq("source_id", input.sourceId)
    .eq("assigned_user_id", input.assignedUserId)
    .maybeSingle();

  if (isCompleted) {
    if (!existing?.id) {
      return;
    }
    const { error } = await admin
      .from("work_items")
      .update({
        project_id: input.mirror.projectId ?? null,
        client_id: input.mirror.clientId ?? null,
        title: input.mirror.title ?? "",
        description: input.mirror.description ?? "",
        status: "verified",
        completed_at: now,
        verified_at: now,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  await upsertWorkItemFromMirror(admin, {
    sourceType: "process_item",
    sourceId: input.sourceId,
    assignedUserId: input.assignedUserId,
    managerId: input.managerId,
    mirror: input.mirror,
    status: input.status,
  });
}

export async function syncWorkItemsFromProcessItemServer(admin: AdminClient, processItemId: string) {
  const { data: row, error } = await admin
    .from("project_process_items")
    .select("id, project_id, template_item_id, kind, status, assignee_id, payload, signed_at")
    .eq("id", processItemId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!row) {
    return;
  }

  const typedRow = row as ProcessItemSyncRow;
  if (typedRow.kind === "kanban") {
    return;
  }

  if (!typedRow.assignee_id) {
    await cancelUnassignedProcessItemWorkItems(admin, processItemId);
    return;
  }

  const [{ data: template }, { data: project }] = await Promise.all([
    admin.from("process_items").select("id, title").eq("id", typedRow.template_item_id).maybeSingle(),
    admin.from("projects").select("id, client_id").eq("id", typedRow.project_id).maybeSingle(),
  ]);

  const titleByTemplate = new Map<string, string>();
  if (template?.id) {
    titleByTemplate.set(template.id as string, template.title as string);
  }

  const effectiveStatus = resolveEffectiveProcessItemStatus(typedRow);
  const workStatus = mapProcessItemStatus(effectiveStatus);
  const mirror: WorkItemMirrorFields = {
    title: resolveProcessItemTitle(typedRow, titleByTemplate),
    description: "",
    projectId: typedRow.project_id,
    clientId: (project?.client_id as string | null) ?? null,
    assignedUserId: typedRow.assignee_id,
    status: workStatus,
  };

  await cancelProcessItemWorkItemsForOtherAssignees(admin, processItemId, typedRow.assignee_id);
  await applyProcessItemMirrorToWorkItem(admin, {
    sourceId: processItemId,
    assignedUserId: typedRow.assignee_id,
    managerId: null,
    mirror,
    status: workStatus,
  });
}

export async function syncProcessItemsToWorkItemsServer(
  admin: AdminClient,
  userId: string,
  managerId: string | null,
) {
  const { data, error } = await admin
    .from("project_process_items")
    .select("id, project_id, template_item_id, kind, status, assignee_id, payload, signed_at")
    .eq("assignee_id", userId)
    .neq("kind", "kanban");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ProcessItemSyncRow[];
  if (!rows.length) {
    return;
  }

  const templateIds = [...new Set(rows.map((row) => row.template_item_id))];
  const projectIds = [...new Set(rows.map((row) => row.project_id))];

  const [{ data: templates }, { data: projects }] = await Promise.all([
    templateIds.length
      ? admin.from("process_items").select("id, title").in("id", templateIds)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? admin.from("projects").select("id, client_id").in("id", projectIds)
      : Promise.resolve({ data: [] }),
  ]);

  const titleByTemplate = new Map((templates ?? []).map((row) => [row.id as string, row.title as string]));
  const clientByProject = new Map((projects ?? []).map((row) => [row.id as string, row.client_id as string | null]));

  await Promise.all(
    rows.map((row) => cancelProcessItemWorkItemsForOtherAssignees(admin, row.id, userId)),
  );

  for (const row of rows) {
    const effectiveStatus = resolveEffectiveProcessItemStatus(row);
    const workStatus = mapProcessItemStatus(effectiveStatus);
    const mirror: WorkItemMirrorFields = {
      title: resolveProcessItemTitle(row, titleByTemplate),
      description: "",
      projectId: row.project_id,
      clientId: clientByProject.get(row.project_id) ?? null,
      assignedUserId: userId,
      status: workStatus,
    };

    await applyProcessItemMirrorToWorkItem(admin, {
      sourceId: row.id,
      assignedUserId: userId,
      managerId,
      mirror,
      status: workStatus,
    });
  }
}

export async function syncWorkItemToProcessItemServer(
  admin: AdminClient,
  workItem: Pick<WorkItem, "sourceId" | "assignedUserId" | "status">,
  patch: WorkItemPatch,
) {
  if (!workItem.sourceId) {
    return;
  }

  const { data: processItem, error } = await admin
    .from("project_process_items")
    .select("id, project_id, template_item_id, kind, status, signed_at")
    .eq("id", workItem.sourceId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!processItem || processItem.kind === "kanban") {
    return;
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = { updated_at: now };
  let nextStatus: ProjectProcessItemStatus | null = null;

  if (patch.assignedUserId !== undefined) {
    let assigneeName: string | null = null;
    if (patch.assignedUserId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", patch.assignedUserId)
        .maybeSingle();
      assigneeName = profile ? getUserDisplayName(mapProfileRow(profile)) : null;
    }
    updatePayload.assignee_id = patch.assignedUserId;
    updatePayload.assignee_name = assigneeName;
  }

  const statusPatch = patch.status ?? null;
  if (statusPatch) {
    nextStatus = mapWorkItemStatusToProcessItemStatus(statusPatch);
    if (nextStatus) {
      updatePayload.status = nextStatus;
    }
  }

  if (Object.keys(updatePayload).length > 1) {
    const { error: updateError } = await admin
      .from("project_process_items")
      .update(updatePayload)
      .eq("id", workItem.sourceId);
    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  if (statusPatch && shouldMarkProcessItemCompleted(statusPatch)) {
    await updateProjectProcessCompletionServer(
      admin,
      processItem.project_id as string,
      processItem.template_item_id as string,
      true,
      workItem.assignedUserId,
    );
  } else if (statusPatch && shouldClearProcessItemCompletion(statusPatch)) {
    await updateProjectProcessCompletionServer(
      admin,
      processItem.project_id as string,
      processItem.template_item_id as string,
      false,
    );
  } else if (nextStatus === "completed") {
    await updateProjectProcessCompletionServer(
      admin,
      processItem.project_id as string,
      processItem.template_item_id as string,
      true,
      workItem.assignedUserId,
    );
  }
}

export async function cancelMisassignedProcessItemWorkItemsForUser(
  admin: AdminClient,
  userId: string,
) {
  const { data: workItems, error } = await admin
    .from("work_items")
    .select("id, source_id")
    .eq("source_type", "process_item")
    .eq("assigned_user_id", userId)
    .not("status", "in", '("verified","cancelled","not_done")');
  if (error) {
    throw new Error(error.message);
  }
  if (!workItems?.length) {
    return;
  }

  const sourceIds = [
    ...new Set(workItems.map((row) => row.source_id as string | null).filter(Boolean)),
  ] as string[];
  if (!sourceIds.length) {
    return;
  }

  const { data: processItems, error: processError } = await admin
    .from("project_process_items")
    .select("id, assignee_id")
    .in("id", sourceIds);
  if (processError) {
    throw new Error(processError.message);
  }

  const assigneeBySourceId = new Map(
    (processItems ?? []).map((row) => [row.id as string, row.assignee_id as string | null]),
  );

  const orphanIds = workItems
    .filter((row) => {
      const sourceId = row.source_id as string | null;
      if (!sourceId) {
        return true;
      }
      return assigneeBySourceId.get(sourceId) !== userId;
    })
    .map((row) => row.id as string);

  if (!orphanIds.length) {
    return;
  }

  const now = new Date().toISOString();
  const { error: cancelError } = await admin
    .from("work_items")
    .update({ status: "cancelled", updated_at: now })
    .in("id", orphanIds);
  if (cancelError) {
    throw new Error(cancelError.message);
  }

  await admin.from("work_plan_items").delete().in("work_item_id", orphanIds);
}
