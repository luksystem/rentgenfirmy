import type {
  KanbanBoard,
  KanbanComment,
  KanbanPriority,
  KanbanTask,
  KanbanTaskEvent,
} from "@/lib/process/kanban-types";
import { getMilestoneDateStatus } from "@/lib/process/dates";
import { matchesKanbanAssigneeFilter } from "@/lib/kanban/task-assignee";
import type { DictionaryItem } from "@/lib/resource-plan/dictionary-types";
import type { UserProfile } from "@/lib/auth/types";

export const KANBAN_STALE_DAYS = 7;

export type KanbanColumnSortMode = "position" | "priority" | "dueDate";

export type KanbanBoardFilters = {
  priority: KanbanPriority | "all";
  assignee: string | "all" | "unassigned";
  /** Id projektu lub `name:…` gdy brak id — tylko tablica zbiorcza. */
  projectId?: string | "all";
  /** Ukryj zamknięte zgłoszenia — domyślnie włączone na mobile, zapamiętywane w localStorage. */
  hideClosed?: boolean;
};

export const DEFAULT_KANBAN_BOARD_FILTERS: KanbanBoardFilters = {
  priority: "all",
  assignee: "all",
  projectId: "all",
  hideClosed: false,
};

const KANBAN_HIDE_CLOSED_STORAGE_KEY = "kanban-hide-closed";

function isCoarsePointerViewport() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/** Domyślny stan „ukryj zamknięte” — jawny wybór użytkownika z localStorage, w innym razie włączony na dotyku. */
export function getDefaultKanbanHideClosed() {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const stored = window.localStorage.getItem(KANBAN_HIDE_CLOSED_STORAGE_KEY);
    if (stored === "true" || stored === "false") {
      return stored === "true";
    }
  } catch {
    // ignore storage errors
  }
  return isCoarsePointerViewport();
}

export function persistKanbanHideClosed(value: boolean) {
  try {
    window.localStorage.setItem(KANBAN_HIDE_CLOSED_STORAGE_KEY, String(value));
  } catch {
    // ignore storage errors
  }
}

export function countActiveKanbanBoardFilters(filters: KanbanBoardFilters) {
  let count = 0;
  if (filters.priority !== "all") {
    count += 1;
  }
  if (filters.assignee !== "all") {
    count += 1;
  }
  if (filters.projectId && filters.projectId !== "all") {
    count += 1;
  }
  return count;
}

export type KanbanTaskActivity = {
  lastActivityAt: string;
  staleDays: number;
  isStale: boolean;
};

const PRIORITY_ORDER: Record<KanbanPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function parseTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getTaskLastActivityAt(
  task: KanbanTask,
  comments: KanbanComment[],
  events: KanbanTaskEvent[],
) {
  const timestamps = [task.updatedAt, task.createdAt];
  for (const comment of comments) {
    if (comment.taskId === task.id) {
      timestamps.push(comment.createdAt);
    }
  }
  for (const event of events) {
    if (event.taskId === task.id) {
      timestamps.push(event.createdAt);
    }
  }
  return new Date(Math.max(...timestamps.map(parseTimestamp))).toISOString();
}

export function getTaskActivity(
  task: KanbanTask,
  comments: KanbanComment[],
  events: KanbanTaskEvent[],
): KanbanTaskActivity {
  const lastActivityAt = getTaskLastActivityAt(task, comments, events);
  const staleDays = Math.floor((Date.now() - parseTimestamp(lastActivityAt)) / (1000 * 60 * 60 * 24));
  return {
    lastActivityAt,
    staleDays,
    isStale: staleDays >= KANBAN_STALE_DAYS,
  };
}

export function buildKanbanTaskActivityMap(board: Pick<KanbanBoard, "tasks" | "comments" | "events">) {
  const map = new Map<string, KanbanTaskActivity>();
  for (const task of board.tasks) {
    map.set(task.id, getTaskActivity(task, board.comments, board.events));
  }
  return map;
}

export function matchesKanbanBoardFilters(
  task: KanbanTask,
  filters: KanbanBoardFilters,
  context?: { teamProfiles?: UserProfile[]; roleOptions?: DictionaryItem[] },
) {
  if (filters.hideClosed && task.closedAt) {
    return false;
  }

  if (filters.priority !== "all" && task.priority !== filters.priority) {
    return false;
  }

  if (filters.assignee === "all") {
    return true;
  }

  if (context?.teamProfiles && context?.roleOptions) {
    return matchesKanbanAssigneeFilter(
      task,
      filters.assignee,
      context.roleOptions,
      context.teamProfiles,
    );
  }

  if (filters.assignee === "unassigned") {
    return !task.assigneeName?.trim() && !task.assigneeId && !task.roleItemId;
  }

  if (filters.assignee !== "all" && task.assigneeName !== filters.assignee) {
    return false;
  }

  return true;
}

function compareDueDates(a: KanbanTask, b: KanbanTask) {
  if (!a.dueDate && !b.dueDate) {
    return a.position - b.position;
  }
  if (!a.dueDate) {
    return 1;
  }
  if (!b.dueDate) {
    return -1;
  }
  const diff = a.dueDate.localeCompare(b.dueDate);
  return diff !== 0 ? diff : a.position - b.position;
}

export function sortKanbanColumnTasksWithMode(
  tasks: KanbanTask[],
  sortMode: KanbanColumnSortMode,
) {
  return [...tasks].sort((a, b) => {
    const aClosed = Boolean(a.closedAt);
    const bClosed = Boolean(b.closedAt);
    if (aClosed !== bClosed) {
      return aClosed ? 1 : -1;
    }

    if (sortMode === "priority") {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.position - b.position;
    }

    if (sortMode === "dueDate") {
      return compareDueDates(a, b);
    }

    return a.position - b.position;
  });
}

export type KanbanBoardStats = {
  openIdle: number;
  inProgress: number;
  closed: number;
  overdue: number;
  total: number;
};

function hasKanbanTaskActivity(
  task: KanbanTask,
  comments: KanbanComment[],
  events: KanbanTaskEvent[],
) {
  if (comments.some((comment) => comment.taskId === task.id)) {
    return true;
  }

  if (events.some((event) => event.taskId === task.id && event.eventType !== "created")) {
    return true;
  }

  if (parseTimestamp(task.updatedAt) > parseTimestamp(task.createdAt) + 60_000) {
    return true;
  }

  if (task.assigneeName?.trim() || task.dueDate) {
    return true;
  }

  return false;
}

export function computeKanbanBoardStats(
  board: Pick<KanbanBoard, "tasks" | "comments" | "events">,
): KanbanBoardStats {
  let openIdle = 0;
  let inProgress = 0;
  let closed = 0;
  let overdue = 0;

  for (const task of board.tasks) {
    if (task.closedAt) {
      closed += 1;
      continue;
    }

    if (task.dueDate && getMilestoneDateStatus(task.dueDate) === "overdue") {
      overdue += 1;
    }

    if (hasKanbanTaskActivity(task, board.comments, board.events)) {
      inProgress += 1;
    } else {
      openIdle += 1;
    }
  }

  return {
    openIdle,
    inProgress,
    closed,
    overdue,
    total: board.tasks.length,
  };
}

export function collectKanbanAssigneeOptions(tasks: KanbanTask[], configuredOptions: string[]) {
  const values = new Set<string>();
  for (const option of configuredOptions) {
    if (option.trim()) {
      values.add(option.trim());
    }
  }
  for (const task of tasks) {
    if (task.assigneeName?.trim()) {
      values.add(task.assigneeName.trim());
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b, "pl-PL"));
}
