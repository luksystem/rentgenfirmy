import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveKanbanSourceLink } from "@/lib/my-work/link-resolver";
import type { WorkItem } from "@/lib/my-work/types";
import {
  mapKanbanPriorityToWork,
  type WorkItemMirrorFields,
  type WorkItemSourceAdapter,
} from "@/lib/my-work/source-adapters/types";

type KanbanTaskContextRow = {
  id: string;
  title: string;
  description: string;
  priority: string;
  due_date: string | null;
  closed_at: string | null;
  assignee_id: string | null;
  column_id: string;
  process_kanban_columns: {
    title: string;
    process_kanban_boards: {
      project_process_item_id: string;
      project_process_items: {
        project_id: string;
        projects: {
          id: string;
          client_id: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

function inferStatusFromKanban(closedAt: string | null, columnTitle: string): WorkItem["status"] {
  if (closedAt) {
    return "verified";
  }
  const lower = columnTitle.toLowerCase();
  if (lower.includes("zrob") || lower.includes("done") || lower.includes("zakoń")) {
    return "pending_verification";
  }
  if (lower.includes("blok") || lower.includes("wstrzym")) {
    return "blocked";
  }
  if (lower.includes("w toku") || lower.includes("realiz") || lower.includes("doing")) {
    return "in_progress";
  }
  return "in_progress";
}

async function fetchKanbanContext(admin: SupabaseClient, sourceId: string) {
  const { data, error } = await admin
    .from("process_kanban_tasks")
    .select(
      `
      id, title, description, priority, due_date, closed_at, assignee_id, column_id,
      process_kanban_columns (
        title,
        process_kanban_boards (
          project_process_item_id,
          project_process_items (
            project_id,
            projects ( id, client_id )
          )
        )
      )
    `,
    )
    .eq("id", sourceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data as KanbanTaskContextRow | null;
}

function mirrorFromKanbanRow(row: KanbanTaskContextRow): WorkItemMirrorFields {
  const column = row.process_kanban_columns;
  const board = column?.process_kanban_boards;
  const processItem = board?.project_process_items;
  const project = processItem?.projects;

  return {
    title: row.title,
    description: row.description ?? "",
    dueDate: row.due_date,
    priority: mapKanbanPriorityToWork(row.priority),
    assignedUserId: row.assignee_id ?? undefined,
    projectId: project?.id ?? processItem?.project_id ?? null,
    clientId: project?.client_id ?? null,
    status: inferStatusFromKanban(row.closed_at, column?.title ?? ""),
    completedAt: row.closed_at,
  };
}

export const kanbanTaskWorkItemAdapter: WorkItemSourceAdapter = {
  sourceType: "kanban_task",

  async fetchMirror(admin, sourceId) {
    const row = await fetchKanbanContext(admin, sourceId);
    if (!row) {
      throw new Error("Nie znaleziono zadania Kanban.");
    }
    return mirrorFromKanbanRow(row);
  },

  async syncToSource(admin, workItem, patch) {
    if (!workItem.sourceId) {
      return;
    }
    const payload: Record<string, unknown> = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.dueDate !== undefined) payload.due_date = patch.dueDate;
    if (patch.priority !== undefined) payload.priority = patch.priority;
    if (patch.completedAt !== undefined) payload.closed_at = patch.completedAt;
    if (patch.assignedUserId !== undefined) payload.assignee_id = patch.assignedUserId;

    if (Object.keys(payload).length === 0) {
      return;
    }

    payload.updated_at = new Date().toISOString();
    const { error } = await admin.from("process_kanban_tasks").update(payload).eq("id", workItem.sourceId);
    if (error) {
      throw new Error(error.message);
    }
  },

  resolveSourceLink(workItem) {
    return resolveKanbanSourceLink(workItem.projectId);
  },

  inferInitialStatus(mirror) {
    return mirror.status ?? "in_progress";
  },
};

export async function fetchOpenKanbanTasksForUser(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("process_kanban_tasks")
    .select("id, assignee_id")
    .eq("assignee_id", userId)
    .is("closed_at", null);

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

/** Jedno zapytanie z pełnym kontekstem lustra — unika N+1 w sync My Work. */
export async function fetchOpenKanbanTaskMirrorsForUser(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("process_kanban_tasks")
    .select(
      `
      id, title, description, priority, due_date, closed_at, assignee_id, column_id,
      process_kanban_columns (
        title,
        process_kanban_boards (
          project_process_item_id,
          project_process_items (
            project_id,
            projects ( id, client_id )
          )
        )
      )
    `,
    )
    .eq("assignee_id", userId)
    .is("closed_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as KanbanTaskContextRow[]).map((row) => ({
    sourceId: row.id,
    mirror: mirrorFromKanbanRow(row),
  }));
}
