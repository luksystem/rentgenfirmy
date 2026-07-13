import type { Goal, GoalPriority, GoalStatus } from "@/lib/goals/types";
import { GOAL_PRIORITIES, GOAL_STATUSES } from "@/lib/goals/types";

export const GOAL_BOARD_OWNER_NONE = "__none__";

export type GoalBoardFilters = {
  ownerId: string;
  status: GoalStatus | "all";
  priority: GoalPriority | "all";
};

export const EMPTY_GOAL_BOARD_FILTERS: GoalBoardFilters = {
  ownerId: "all",
  status: "all",
  priority: "all",
};

export function countActiveGoalBoardFilters(filters: GoalBoardFilters) {
  let count = 0;
  if (filters.ownerId !== "all") count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.priority !== "all") count += 1;
  return count;
}

export function filterGoalsForBoard(
  goals: Goal[],
  filters: GoalBoardFilters,
  options: { showCancelled: boolean },
) {
  return goals.filter((goal) => {
    if (goal.status === "cancelled") {
      if (filters.status === "cancelled") {
        // pokazuj anulowane przy filtrze statusu
      } else if (filters.status !== "all") {
        return false;
      } else if (!options.showCancelled) {
        return false;
      }
    }

    if (filters.ownerId !== "all") {
      if (filters.ownerId === GOAL_BOARD_OWNER_NONE) {
        if (goal.ownerId) return false;
      } else if (goal.ownerId !== filters.ownerId) {
        return false;
      }
    }

    if (filters.status !== "all" && goal.status !== filters.status) {
      return false;
    }

    if (filters.priority !== "all" && goal.priority !== filters.priority) {
      return false;
    }

    return true;
  });
}

export function collectGoalBoardOwnerOptions(
  goals: Goal[],
  getOwnerName: (profileId: string | null) => string,
) {
  const byId = new Map<string, string>();

  for (const goal of goals) {
    if (!goal.ownerId) {
      byId.set(GOAL_BOARD_OWNER_NONE, "Brak właściciela");
      continue;
    }
    if (!byId.has(goal.ownerId)) {
      byId.set(goal.ownerId, getOwnerName(goal.ownerId));
    }
  }

  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));
}

export type GoalCollectiveFilters = GoalBoardFilters & {
  boardId: string;
};

export const EMPTY_GOAL_COLLECTIVE_FILTERS: GoalCollectiveFilters = {
  ...EMPTY_GOAL_BOARD_FILTERS,
  boardId: "all",
};

export function countActiveGoalCollectiveFilters(filters: GoalCollectiveFilters) {
  return countActiveGoalBoardFilters(filters) + (filters.boardId !== "all" ? 1 : 0);
}

export function filterGoalsForCollective(
  goals: Goal[],
  filters: GoalCollectiveFilters,
  context?: { projectId?: string | null; clientId?: string | null },
) {
  return filterGoalsForBoard(goals, filters, { showCancelled: true }).filter((goal) => {
    if (filters.boardId !== "all" && goal.boardId !== filters.boardId) {
      return false;
    }
    if (context?.projectId && goal.projectId !== context.projectId) {
      return false;
    }
    if (context?.clientId && goal.clientId !== context.clientId) {
      return false;
    }
    return true;
  });
}

const GOAL_COLLECTIVE_FILTERS_STORAGE_KEY = "goal-collective-filters";

export function readStoredGoalCollectiveFilters(): GoalCollectiveFilters {
  if (typeof window === "undefined") {
    return EMPTY_GOAL_COLLECTIVE_FILTERS;
  }
  try {
    const raw = window.localStorage.getItem(GOAL_COLLECTIVE_FILTERS_STORAGE_KEY);
    if (!raw) {
      return EMPTY_GOAL_COLLECTIVE_FILTERS;
    }
    const parsed = JSON.parse(raw) as Partial<GoalCollectiveFilters>;
    return {
      ownerId: typeof parsed.ownerId === "string" ? parsed.ownerId : "all",
      status:
        parsed.status === "all" || (parsed.status && GOAL_STATUSES.includes(parsed.status))
          ? (parsed.status ?? "all")
          : "all",
      priority:
        parsed.priority === "all" || (parsed.priority && GOAL_PRIORITIES.includes(parsed.priority))
          ? (parsed.priority ?? "all")
          : "all",
      boardId: typeof parsed.boardId === "string" ? parsed.boardId : "all",
    };
  } catch {
    return EMPTY_GOAL_COLLECTIVE_FILTERS;
  }
}

export function writeStoredGoalCollectiveFilters(filters: GoalCollectiveFilters) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(GOAL_COLLECTIVE_FILTERS_STORAGE_KEY, JSON.stringify(filters));
}
