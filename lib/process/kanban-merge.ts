import type { KanbanBoard, KanbanColumn, KanbanTask } from "@/lib/process/kanban-types";

export type KanbanTaskSource = {
  taskId: string;
  boardId: string;
  projectProcessItemId: string;
  projectId: string | null;
  projectName: string;
  sourceColumnId: string;
  sourceColumnTitle: string;
};

export type MergedKanbanView = {
  boards: KanbanBoard[];
  taskSources: Map<string, KanbanTaskSource>;
  displayBoard: KanbanBoard;
};

function normalizeColumnTitle(title: string) {
  return title.trim().toLowerCase();
}

function buildMergedColumns(boards: KanbanBoard[]): KanbanColumn[] {
  const columnMeta = new Map<string, { title: string; position: number }>();

  for (const board of boards) {
    for (const column of board.columns) {
      const key = normalizeColumnTitle(column.title);
      const existing = columnMeta.get(key);
      if (!existing || column.position < existing.position) {
        columnMeta.set(key, { title: column.title.trim(), position: column.position });
      }
    }
  }

  return [...columnMeta.entries()]
    .sort((left, right) => left[1].position - right[1].position)
    .map(([key, meta], index) => ({
      id: `merged:${key}`,
      boardId: "merged",
      title: meta.title,
      position: index,
    }));
}

export function mergeKanbanBoards(boards: KanbanBoard[]): MergedKanbanView | null {
  if (!boards.length) {
    return null;
  }

  const mergedColumns = buildMergedColumns(boards);
  if (!mergedColumns.length) {
    return null;
  }

  const titleToMergedId = new Map(
    mergedColumns.map((column) => [normalizeColumnTitle(column.title), column.id]),
  );
  const taskSources = new Map<string, KanbanTaskSource>();
  const tasks: KanbanTask[] = [];
  const comments: KanbanBoard["comments"] = [];
  const reactions: KanbanBoard["reactions"] = [];
  const events: KanbanBoard["events"] = [];
  const attachments: KanbanBoard["attachments"] = [];

  for (const board of boards) {
    const columnById = new Map(board.columns.map((column) => [column.id, column]));

    for (const task of board.tasks) {
      const sourceColumn = columnById.get(task.columnId);
      const mergedColumnId = sourceColumn
        ? titleToMergedId.get(normalizeColumnTitle(sourceColumn.title))
        : mergedColumns[0]?.id;

      if (!sourceColumn || !mergedColumnId) {
        continue;
      }

      taskSources.set(task.id, {
        taskId: task.id,
        boardId: board.id,
        projectProcessItemId: board.projectProcessItemId,
        projectId: board.projectId,
        projectName: board.projectName,
        sourceColumnId: task.columnId,
        sourceColumnTitle: sourceColumn.title,
      });

      tasks.push({ ...task, columnId: mergedColumnId });
    }

    comments.push(...board.comments);
    reactions.push(...board.reactions);
    events.push(...board.events);
    attachments.push(...board.attachments);
  }

  const displayBoard: KanbanBoard = {
    id: "merged",
    projectProcessItemId: "",
    projectId: null,
    projectName: "Wszystkie projekty",
    projectType: null,
    publicToken: "",
    publicEnabled: false,
    publicAccessConfigured: false,
    publicAccessUsernameRequired: false,
    publicAccessUsername: null,
    publicAuthorName: "",
    columns: mergedColumns,
    tasks,
    comments,
    reactions,
    events,
    attachments,
    createdAt: "",
    updatedAt: "",
  };

  return { boards, taskSources, displayBoard };
}

export function canMoveTaskToMergedColumn(
  taskId: string,
  mergedColumnId: string,
  mergedView: MergedKanbanView,
) {
  return resolveTargetColumnId(taskId, mergedColumnId, mergedView) !== null;
}

export function resolveTargetColumnId(
  taskId: string,
  mergedColumnId: string,
  mergedView: MergedKanbanView,
) {
  const source = mergedView.taskSources.get(taskId);
  if (!source) {
    return null;
  }

  const mergedColumn = mergedView.displayBoard.columns.find((column) => column.id === mergedColumnId);
  if (!mergedColumn) {
    return null;
  }

  const board = mergedView.boards.find((entry) => entry.id === source.boardId);
  if (!board) {
    return null;
  }

  const targetColumn = board.columns.find(
    (column) => normalizeColumnTitle(column.title) === normalizeColumnTitle(mergedColumn.title),
  );

  return targetColumn?.id ?? null;
}
