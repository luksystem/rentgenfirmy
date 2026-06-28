import type {
  KanbanAuthorSide,
  KanbanBoard,
  KanbanComment,
  KanbanColumn,
  KanbanPriority,
  KanbanTask,
  KanbanTaskEvent,
  KanbanTaskEventType,
  KanbanTaskReaction,
  KanbanTemplatePayload,
} from "@/lib/process/kanban-types";
import { isKanbanReactionEmoji } from "@/lib/process/kanban-reactions";
import type { MentionCandidate } from "@/lib/notifications/types";
import { createKanbanMentionNotifications, createKanbanNewActivityNotifications, resolveKanbanPublicLinkForColumn, resolveKanbanPublicLinkForTask } from "@/lib/notifications/repository";
import { resolveMentionTargets } from "@/lib/notifications/mentions";
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

export type KanbanBoardRow = BoardRow;

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
  assignee_name: string | null;
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

type ReactionRow = {
  id: string;
  task_id: string;
  emoji: string;
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
    assigneeName: row.assignee_name?.trim() || null,
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

function rowToReaction(row: ReactionRow): KanbanTaskReaction {
  return {
    id: row.id,
    taskId: row.task_id,
    emoji: row.emoji,
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

type BoardProjectInfo = {
  projectId: string | null;
  projectName: string;
  projectType: string | null;
  clientId: string | null;
};

function groupRowsByKey<T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      map.set(key, [row]);
    }
  }
  return map;
}

async function fetchBoardProjectInfoBatch(itemIds: string[]): Promise<Map<string, BoardProjectInfo>> {
  const map = new Map<string, BoardProjectInfo>();
  if (!itemIds.length) {
    return map;
  }

  const supabase = getSupabase();
  const { data: items, error: itemsError } = await supabase
    .from("project_process_items")
    .select("id, project_id")
    .in("id", itemIds);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const projectIds = [
    ...new Set((items ?? []).map((row) => row.project_id as string).filter(Boolean)),
  ];

  const { data: projects, error: projectsError } = projectIds.length
    ? await supabase.from("projects").select("id, name, type, client_id").in("id", projectIds)
    : { data: [], error: null };

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  const projectById = new Map(
    (projects ?? []).map((row) => [
      row.id as string,
      {
        name: (row.name as string)?.trim() || "Projekt",
        type: (row.type as string)?.trim() || null,
        clientId: (row.client_id as string | null) ?? null,
      },
    ]),
  );

  for (const item of items ?? []) {
    const itemId = item.id as string;
    const project = item.project_id ? projectById.get(item.project_id as string) : null;
    map.set(itemId, {
      projectId: (item.project_id as string | null) ?? null,
      projectName: project?.name ?? "Projekt",
      projectType: project?.type ?? null,
      clientId: project?.clientId ?? null,
    });
  }

  for (const itemId of itemIds) {
    if (!map.has(itemId)) {
      map.set(itemId, {
        projectId: null,
        projectName: "Projekt",
        projectType: null,
        clientId: null,
      });
    }
  }

  return map;
}

function assembleKanbanBoard(
  boardRow: BoardRow,
  projectInfo: BoardProjectInfo,
  columns: ColumnRow[],
  tasks: TaskRow[],
  comments: CommentRow[],
  reactions: ReactionRow[],
  events: EventRow[],
  attachments: KanbanBoard["attachments"],
): KanbanBoard {
  return {
    id: boardRow.id,
    projectProcessItemId: boardRow.project_process_item_id,
    projectId: projectInfo.projectId,
    projectName: projectInfo.projectName,
    projectType: projectInfo.projectType,
    publicToken: boardRow.public_token,
    publicEnabled: boardRow.public_enabled,
    publicAccessConfigured: Boolean(boardRow.public_access_password_hash),
    publicAccessUsernameRequired: Boolean(boardRow.public_access_username?.trim()),
    publicAccessUsername: boardRow.public_access_username?.trim() || null,
    publicAuthorName: boardRow.public_author_name?.trim() || "Klient",
    columns: columns.map(rowToColumn),
    tasks: tasks.map(rowToTask),
    comments: comments.map(rowToComment),
    reactions: reactions.map(rowToReaction),
    events: events.map(rowToEvent),
    attachments,
    createdAt: boardRow.created_at,
    updatedAt: boardRow.updated_at,
  };
}

export async function fetchKanbanBoardGraphsBatch(boardRows: BoardRow[]): Promise<KanbanBoard[]> {
  if (!boardRows.length) {
    return [];
  }

  const supabase = getSupabase();
  const boardIds = boardRows.map((row) => row.id);
  const itemIds = [...new Set(boardRows.map((row) => row.project_process_item_id))];

  const [columnsResult, projectInfoMap] = await Promise.all([
    supabase
      .from("process_kanban_columns")
      .select("*")
      .in("board_id", boardIds)
      .order("position", { ascending: true }),
    fetchBoardProjectInfoBatch(itemIds),
  ]);

  if (columnsResult.error) {
    throw new Error(columnsResult.error.message);
  }

  const allColumns = (columnsResult.data ?? []) as ColumnRow[];
  const columnIds = allColumns.map((row) => row.id);
  const columnsByBoard = groupRowsByKey(allColumns, (row) => row.board_id);

  const tasksResult = columnIds.length
    ? await supabase
        .from("process_kanban_tasks")
        .select("*")
        .in("column_id", columnIds)
        .order("position", { ascending: true })
    : { data: [], error: null };

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  const allTasks = (tasksResult.data ?? []) as TaskRow[];
  const taskIds = allTasks.map((row) => row.id);

  const [commentsResult, eventsResult, reactionsResult, attachments] = await Promise.all([
    taskIds.length
      ? supabase
          .from("process_kanban_comments")
          .select("*")
          .in("task_id", taskIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    taskIds.length
      ? supabase
          .from("process_kanban_task_events")
          .select("*")
          .in("task_id", taskIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    taskIds.length
      ? supabase
          .from("process_kanban_task_reactions")
          .select("*")
          .in("task_id", taskIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    taskIds.length ? fetchAttachmentsForTaskIds(taskIds) : Promise.resolve([]),
  ]);

  if (commentsResult.error) {
    throw new Error(commentsResult.error.message);
  }
  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }
  if (reactionsResult.error) {
    if (!reactionsResult.error.message.toLowerCase().includes("does not exist")) {
      throw new Error(reactionsResult.error.message);
    }
  }

  const allComments = (commentsResult.data ?? []) as CommentRow[];
  const allEvents = (eventsResult.data ?? []) as EventRow[];
  const allReactions = reactionsResult.error
    ? ([] as ReactionRow[])
    : ((reactionsResult.data ?? []) as ReactionRow[]);
  const taskIdSetForBoard = (boardColumnIds: Set<string>) =>
    new Set(allTasks.filter((task) => boardColumnIds.has(task.column_id)).map((task) => task.id));

  return boardRows.map((boardRow) => {
    const boardColumns = columnsByBoard.get(boardRow.id) ?? [];
    const boardColumnIds = new Set(boardColumns.map((column) => column.id));
    const boardTasks = allTasks.filter((task) => boardColumnIds.has(task.column_id));
    const boardTaskIds = taskIdSetForBoard(boardColumnIds);
    const boardComments = allComments.filter((comment) => boardTaskIds.has(comment.task_id));
    const boardReactions = allReactions.filter((reaction) => boardTaskIds.has(reaction.task_id));
    const boardEvents = allEvents.filter((event) => boardTaskIds.has(event.task_id));
    const boardAttachments = attachments.filter((entry) => boardTaskIds.has(entry.taskId));
    const projectInfo =
      projectInfoMap.get(boardRow.project_process_item_id) ??
      ({
        projectId: null,
        projectName: "Projekt",
        projectType: null,
        clientId: null,
      } satisfies BoardProjectInfo);

    return assembleKanbanBoard(
      boardRow,
      projectInfo,
      boardColumns,
      boardTasks,
      boardComments,
      boardReactions,
      boardEvents,
      boardAttachments,
    );
  });
}

async function fetchBoardGraph(boardRow: BoardRow): Promise<KanbanBoard> {
  const boards = await fetchKanbanBoardGraphsBatch([boardRow]);
  return boards[0];
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
    const existingRow = existing as BoardRow;
    const { applyKanbanTemplateAccess } = await import("@/lib/supabase/kanban-public-server");
    await applyKanbanTemplateAccess(existingRow.id, template, { onlyIfUnset: true });
    return fetchBoardGraph(existingRow);
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
  const projectInfo = await fetchBoardProjectInfo(projectProcessItemId);

  let clientName: string | null = null;
  if (projectInfo.clientId) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("full_name")
      .eq("id", projectInfo.clientId)
      .maybeSingle();

    if (clientError) {
      throw new Error(clientError.message);
    }

    clientName = client?.full_name?.trim() || null;
  }

  return {
    projectId: projectInfo.projectId,
    projectName: projectInfo.projectName,
    projectType: projectInfo.projectType,
    clientName,
    assigneeOptions: [] as string[],
  };
}

async function fetchBoardProjectInfo(projectProcessItemId: string) {
  const map = await fetchBoardProjectInfoBatch([projectProcessItemId]);
  return (
    map.get(projectProcessItemId) ?? {
      projectId: null,
      projectName: "Projekt",
      projectType: null,
      clientId: null as string | null,
    }
  );
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

export async function fetchProjectKanbanPublicLinks(projectId: string) {
  const { fetchProcessPublicLinksForProject, mapProcessPublicLinksToPaths } = await import(
    "@/lib/supabase/process-public-access-repository"
  );
  const links = await fetchProcessPublicLinksForProject(getSupabase(), projectId);
  return mapProcessPublicLinksToPaths(links);
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

export async function countOverdueKanbanTasks() {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("process_kanban_tasks")
    .select("id", { count: "exact", head: true })
    .is("closed_at", null)
    .not("due_date", "is", null)
    .lt("due_date", today);

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

  const task = rowToTask(data as TaskRow);

  if (input.authorSide === "client") {
    const linkUrl = await resolveKanbanPublicLinkForColumn(supabase, input.columnId);
    await createKanbanNewActivityNotifications({
      sourceId: task.id,
      taskTitle: title,
      authorName: input.authorName,
      body: input.description?.trim() || title,
      linkUrl,
    }).catch(() => undefined);
  }

  return task;
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
  patch: Partial<Pick<KanbanTask, "title" | "description" | "priority" | "dueDate" | "assigneeName">>,
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
  if (patch.assigneeName !== undefined) {
    payload.assignee_name = patch.assigneeName?.trim() || null;
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
  taskTitle?: string;
  linkUrl?: string;
  mentionCandidates?: MentionCandidate[];
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

  const comment = rowToComment(data as CommentRow);

  if (input.authorSide === "client") {
    const mentionTargets = input.mentionCandidates?.length
      ? resolveMentionTargets(body, input.mentionCandidates)
      : [];
    const excludeProfileIds = mentionTargets
      .map((target) => target.profileId)
      .filter((profileId): profileId is string => Boolean(profileId));
    const linkUrl =
      input.linkUrl ?? (await resolveKanbanPublicLinkForTask(supabase, input.taskId));

    await createKanbanNewActivityNotifications({
      sourceId: comment.id,
      taskTitle: input.taskTitle ?? "Zgłoszenie",
      authorName: input.authorName,
      body,
      linkUrl,
      excludeProfileIds,
    }).catch(() => undefined);
  }

  if (input.mentionCandidates?.length) {
    await createKanbanMentionNotifications({
      commentId: comment.id,
      taskId: input.taskId,
      taskTitle: input.taskTitle ?? "Zgłoszenie",
      body,
      authorName: input.authorName,
      candidates: input.mentionCandidates,
      linkUrl: input.linkUrl,
    }).catch(() => undefined);
  }

  return comment;
}

export async function updateKanbanComment(
  commentId: string,
  input: { body: string; authorName: string; authorSide: KanbanAuthorSide },
) {
  const supabase = getSupabase();
  const body = input.body.trim();
  if (!body) {
    throw new Error("Komentarz nie może być pusty.");
  }

  const { data, error } = await supabase
    .from("process_kanban_comments")
    .update({ body })
    .eq("id", commentId)
    .eq("author_name", input.authorName.trim())
    .eq("author_side", input.authorSide)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Nie można edytować tego komentarza.");
  }

  return rowToComment(data as CommentRow);
}

export async function deleteKanbanComment(
  commentId: string,
  input: { authorName: string; authorSide: KanbanAuthorSide },
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("process_kanban_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_name", input.authorName.trim())
    .eq("author_side", input.authorSide)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Nie można usunąć tego komentarza.");
  }
}

export async function toggleKanbanTaskReaction(input: {
  taskId: string;
  emoji: string;
  authorName: string;
  authorSide: KanbanAuthorSide;
}) {
  if (!isKanbanReactionEmoji(input.emoji)) {
    throw new Error("Nieobsługiwana reakcja.");
  }

  const supabase = getSupabase();
  const authorName = input.authorName.trim();
  if (!authorName) {
    throw new Error("Brak autora reakcji.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("process_kanban_task_reactions")
    .select("id")
    .eq("task_id", input.taskId)
    .eq("emoji", input.emoji)
    .eq("author_name", authorName)
    .eq("author_side", input.authorSide)
    .maybeSingle();

  if (existingError) {
    if (existingError.message.toLowerCase().includes("does not exist")) {
      throw new Error("Reakcje nie są jeszcze dostępne. Uruchom migrację bazy danych.");
    }
    throw new Error(existingError.message);
  }

  if (existing) {
    const { error } = await supabase.from("process_kanban_task_reactions").delete().eq("id", existing.id);
    if (error) {
      throw new Error(error.message);
    }
    return { added: false };
  }

  const { error } = await supabase.from("process_kanban_task_reactions").insert({
    id: crypto.randomUUID(),
    task_id: input.taskId,
    emoji: input.emoji,
    author_name: authorName,
    author_side: input.authorSide,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return { added: true };
}

export function getBoardIdFromGraph(board: KanbanBoard) {
  return board.id;
}

export async function fetchBoardGraphAdmin(boardRow: BoardRow) {
  return fetchBoardGraph(boardRow);
}
