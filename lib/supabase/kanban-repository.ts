import type {
  KanbanAuthorSide,
  KanbanBoard,
  KanbanComment,
  KanbanColumn,
  KanbanPriority,
  KanbanTask,
  KanbanTaskEvent,
  KanbanTaskEventType,
  KanbanTemplatePayload,
} from "@/lib/process/kanban-types";
import { getSupabase } from "@/lib/supabase/client";
import { fetchAttachmentsForTaskIds } from "@/lib/supabase/kanban-attachments-repository";

type BoardRow = {
  id: string;
  project_process_item_id: string;
  public_token: string;
  public_enabled: boolean;
  public_access_password_hash?: string | null;
  public_access_username?: string | null;
  public_author_name?: string | null;
  created_at: string;
  updated_at: string;
};

type ColumnRow = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
};

type TaskRow = {
  id: string;
  column_id: string;
  title: string;
  description: string;
  priority: string;
  due_date: string | null;
  position: number;
  closed_at: string | null;
  created_by_side: string;
  is_new_for_team: boolean;
  created_at: string;
  updated_at: string;
};

type CommentRow = {
  id: string;
  task_id: string;
  author_name: string;
  author_side: string;
  body: string;
  created_at: string;
};

type EventRow = {
  id: string;
  task_id: string;
  event_type: string;
  author_name: string;
  author_side: string;
  created_at: string;
};

function isKanbanTaskEventType(value: string): value is KanbanTaskEventType {
  return value === "created" || value === "closed" || value === "reopened";
}

function isKanbanPriority(value: string): value is KanbanPriority {
  return value === "low" || value === "normal" || value === "high" || value === "urgent";
}

function isAuthorSide(value: string): value is KanbanAuthorSide {
  return value === "team" || value === "client";
}

function rowToColumn(row: ColumnRow): KanbanColumn {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: row.position,
  };
}

function rowToTask(row: TaskRow): KanbanTask {
  return {
    id: row.id,
    columnId: row.column_id,
    title: row.title,
    description: row.description,
    priority: isKanbanPriority(row.priority) ? row.priority : "normal",
    dueDate: row.due_date,
    position: row.position,
    closedAt: row.closed_at,
    createdBySide: isAuthorSide(row.created_by_side) ? row.created_by_side : "team",
    isNewForTeam: row.is_new_for_team,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToComment(row: CommentRow): KanbanComment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorName: row.author_name,
    authorSide: isAuthorSide(row.author_side) ? row.author_side : "team",
    body: row.body,
    createdAt: row.created_at,
  };
}

function rowToEvent(row: EventRow): KanbanTaskEvent {
  return {
    id: row.id,
    taskId: row.task_id,
    eventType: isKanbanTaskEventType(row.event_type) ? row.event_type : "created",
    authorName: row.author_name,
    authorSide: isAuthorSide(row.author_side) ? row.author_side : "team",
    createdAt: row.created_at,
  };
}

async function insertKanbanTaskEvent(input: {
  taskId: string;
  eventType: KanbanTaskEventType;
  authorName: string;
  authorSide: KanbanAuthorSide;
  createdAt?: string;
}) {
  const supabase = getSupabase();
  const { error } = await supabase.from("process_kanban_task_events").insert({
    id: crypto.randomUUID(),
    task_id: input.taskId,
    event_type: input.eventType,
    author_name: input.authorName.trim() || "Nieznany",
    author_side: input.authorSide,
    created_at: input.createdAt ?? new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function fetchBoardGraph(boardRow: BoardRow): Promise<KanbanBoard> {
  const supabase = getSupabase();

  const { data: columns, error: columnsError } = await supabase
    .from("process_kanban_columns")
    .select("*")
    .eq("board_id", boardRow.id)
    .order("position", { ascending: true });

  if (columnsError) {
    throw new Error(columnsError.message);
  }

  const columnIds = (columns ?? []).map((row) => row.id);
  const { data: tasks, error: tasksError } = columnIds.length
    ? await supabase
        .from("process_kanban_tasks")
        .select("*")
        .in("column_id", columnIds)
        .order("position", { ascending: true })
    : { data: [], error: null };

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  const taskIds = (tasks ?? []).map((row) => row.id as string);
  const { data: comments, error: commentsError } = taskIds.length
    ? await supabase
        .from("process_kanban_comments")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  const { data: events, error: eventsError } = taskIds.length
    ? await supabase
        .from("process_kanban_task_events")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const attachments = taskIds.length ? await fetchAttachmentsForTaskIds(taskIds) : [];

  return {
    id: boardRow.id,
    projectProcessItemId: boardRow.project_process_item_id,
    publicToken: boardRow.public_token,
    publicEnabled: boardRow.public_enabled,
    publicAccessConfigured: Boolean(boardRow.public_access_password_hash),
    publicAccessUsernameRequired: Boolean(boardRow.public_access_username?.trim()),
    publicAccessUsername: boardRow.public_access_username?.trim() || null,
    publicAuthorName: boardRow.public_author_name?.trim() || "Klient",
    columns: (columns ?? []).map((row) => rowToColumn(row as ColumnRow)),
    tasks: (tasks ?? []).map((row) => rowToTask(row as TaskRow)),
    comments: (comments ?? []).map((row) => rowToComment(row as CommentRow)),
    events: (events ?? []).map((row) => rowToEvent(row as EventRow)),
    attachments,
    createdAt: boardRow.created_at,
    updatedAt: boardRow.updated_at,
  };
}

export async function ensureKanbanBoard(
  projectProcessItemId: string,
  template: KanbanTemplatePayload,
) {
  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("process_kanban_boards")
    .select("*")
    .eq("project_process_item_id", projectProcessItemId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const { applyKanbanTemplateAccess } = await import("@/lib/supabase/kanban-public-server");
    await applyKanbanTemplateAccess(existing.id, template, { onlyIfUnset: true });
    return fetchBoardGraph(existing as BoardRow);
  }

  const now = new Date().toISOString();
  const boardId = crypto.randomUUID();
  const { data: board, error: boardError } = await supabase
    .from("process_kanban_boards")
    .insert({
      id: boardId,
      project_process_item_id: projectProcessItemId,
      public_enabled: false,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (boardError) {
    throw new Error(boardError.message);
  }

  const { error: columnsError } = await supabase.from("process_kanban_columns").insert(
    template.columns.map((column) => ({
      id: crypto.randomUUID(),
      board_id: boardId,
      title: column.title,
      position: column.position,
    })),
  );

  if (columnsError) {
    throw new Error(columnsError.message);
  }

  const { applyKanbanTemplateAccess } = await import("@/lib/supabase/kanban-public-server");
  await applyKanbanTemplateAccess(boardId, template);

  return fetchBoardGraph(board as BoardRow);
}

export async function fetchKanbanBoardByItemId(projectProcessItemId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_kanban_boards")
    .select("*")
    .eq("project_process_item_id", projectProcessItemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? fetchBoardGraph(data as BoardRow) : null;
}

export async function fetchKanbanBoardByToken(token: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_kanban_boards")
    .select("*")
    .eq("public_token", token)
    .eq("public_enabled", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? fetchBoardGraph(data as BoardRow) : null;
}

export async function fetchKanbanPublicContext(projectProcessItemId: string) {
  const supabase = getSupabase();

  const { data: item, error: itemError } = await supabase
    .from("project_process_items")
    .select("project_id")
    .eq("id", projectProcessItemId)
    .maybeSingle();

  if (itemError) {
    throw new Error(itemError.message);
  }

  if (!item?.project_id) {
    return { projectName: "Projekt", clientName: null };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name, client_id")
    .eq("id", item.project_id)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }

  let clientName: string | null = null;
  if (project?.client_id) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("full_name")
      .eq("id", project.client_id)
      .maybeSingle();

    if (clientError) {
      throw new Error(clientError.message);
    }

    clientName = client?.full_name?.trim() || null;
  }

  return {
    projectName: project?.name?.trim() || "Projekt",
    clientName,
  };
}

export async function setKanbanPublicEnabled(projectProcessItemId: string, enabled: boolean) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_kanban_boards")
    .update({ public_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("project_process_item_id", projectProcessItemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return fetchBoardGraph(data as BoardRow);
}

export async function countOpenKanbanTasks() {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("process_kanban_tasks")
    .select("id", { count: "exact", head: true })
    .is("closed_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function countNewKanbanTasksForTeam() {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("process_kanban_tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_new_for_team", true)
    .is("closed_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function markKanbanBoardRead(boardId: string) {
  const supabase = getSupabase();
  const { data: columns, error: columnsError } = await supabase
    .from("process_kanban_columns")
    .select("id")
    .eq("board_id", boardId);

  if (columnsError) {
    throw new Error(columnsError.message);
  }

  const columnIds = (columns ?? []).map((row) => row.id);
  if (!columnIds.length) {
    return;
  }

  const { error } = await supabase
    .from("process_kanban_tasks")
    .update({ is_new_for_team: false, updated_at: new Date().toISOString() })
    .eq("is_new_for_team", true)
    .in("column_id", columnIds);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createKanbanTask(input: {
  columnId: string;
  title: string;
  description?: string;
  priority?: KanbanPriority;
  dueDate?: string | null;
  authorSide: KanbanAuthorSide;
  authorName: string;
}) {
  const supabase = getSupabase();
  const title = input.title.trim();
  if (!title) {
    throw new Error("Tytuł taska jest wymagany.");
  }

  const { data: lastTask } = await supabase
    .from("process_kanban_tasks")
    .select("position")
    .eq("column_id", input.columnId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("process_kanban_tasks")
    .insert({
      id: crypto.randomUUID(),
      column_id: input.columnId,
      title,
      description: input.description?.trim() ?? "",
      priority: input.priority ?? "normal",
      due_date: input.dueDate ?? null,
      position: (typeof lastTask?.position === "number" ? lastTask.position : -1) + 1,
      created_by_side: input.authorSide,
      is_new_for_team: input.authorSide === "client",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await insertKanbanTaskEvent({
    taskId: (data as TaskRow).id,
    eventType: "created",
    authorName: input.authorName,
    authorSide: input.authorSide,
    createdAt: now,
  });

  return rowToTask(data as TaskRow);
}

export async function moveKanbanTask(taskId: string, columnId: string, position: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_kanban_tasks")
    .update({
      column_id: columnId,
      position,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToTask(data as TaskRow);
}

export async function updateKanbanTask(
  taskId: string,
  patch: Partial<Pick<KanbanTask, "title" | "description" | "priority" | "dueDate">>,
) {
  const supabase = getSupabase();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.title !== undefined) {
    payload.title = patch.title;
  }
  if (patch.description !== undefined) {
    payload.description = patch.description;
  }
  if (patch.priority !== undefined) {
    payload.priority = patch.priority;
  }
  if (patch.dueDate !== undefined) {
    payload.due_date = patch.dueDate;
  }

  const { data, error } = await supabase
    .from("process_kanban_tasks")
    .update(payload)
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToTask(data as TaskRow);
}

export async function closeKanbanTask(
  taskId: string,
  closed: boolean,
  actor?: { authorName: string; authorSide: KanbanAuthorSide },
) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("process_kanban_tasks")
    .update({
      closed_at: closed ? now : null,
      updated_at: now,
    })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (actor) {
    await insertKanbanTaskEvent({
      taskId,
      eventType: closed ? "closed" : "reopened",
      authorName: actor.authorName,
      authorSide: actor.authorSide,
      createdAt: now,
    });
  }

  return rowToTask(data as TaskRow);
}

export async function deleteKanbanTask(taskId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("process_kanban_tasks").delete().eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function addKanbanComment(input: {
  taskId: string;
  authorName: string;
  authorSide: KanbanAuthorSide;
  body: string;
}) {
  const supabase = getSupabase();
  const body = input.body.trim();
  if (!body) {
    throw new Error("Komentarz nie może być pusty.");
  }

  const { data, error } = await supabase
    .from("process_kanban_comments")
    .insert({
      id: crypto.randomUUID(),
      task_id: input.taskId,
      author_name: input.authorName.trim(),
      author_side: input.authorSide,
      body,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (input.authorSide === "client") {
    await supabase
      .from("process_kanban_tasks")
      .update({ is_new_for_team: true, updated_at: new Date().toISOString() })
      .eq("id", input.taskId);
  }

  return rowToComment(data as CommentRow);
}

export function getBoardIdFromGraph(board: KanbanBoard) {
  return board.id;
}

export async function fetchBoardGraphAdmin(boardRow: BoardRow) {
  return fetchBoardGraph(boardRow);
}
