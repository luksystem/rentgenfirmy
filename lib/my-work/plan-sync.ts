export type WeekPlanItemRef = {
  workItemId: string;
  plannedDate: string;
  sortOrder?: number;
};

export type DayPlanSyncChange = {
  date: string;
  removedWorkItemIds: string[];
  addedItems: WeekPlanItemRef[];
  /** Pełna lista pozycji planu tygodnia na ten dzień — służy do wyrównania planu dnia. */
  reconcileToNewIds: string[];
};

function groupIdsByDate(items: WeekPlanItemRef[]) {
  const map = new Map<string, Set<string>>();
  for (const item of items) {
    const bucket = map.get(item.plannedDate) ?? new Set<string>();
    bucket.add(item.workItemId);
    map.set(item.plannedDate, bucket);
  }
  return map;
}

export function computeDayPlanSyncChanges(
  oldItems: WeekPlanItemRef[],
  newItems: WeekPlanItemRef[],
): DayPlanSyncChange[] {
  const oldByDate = groupIdsByDate(oldItems);
  const newByDate = groupIdsByDate(newItems);
  const dates = new Set([...oldByDate.keys(), ...newByDate.keys()]);
  const changes: DayPlanSyncChange[] = [];

  for (const date of dates) {
    const oldIds = oldByDate.get(date) ?? new Set<string>();
    const newIds = newByDate.get(date) ?? new Set<string>();
    const removedWorkItemIds = [...oldIds].filter((id) => !newIds.has(id));
    const addedWorkItemIds = [...newIds].filter((id) => !oldIds.has(id));
    const addedItems = newItems.filter(
      (item) => item.plannedDate === date && addedWorkItemIds.includes(item.workItemId),
    );
    const setsEqual =
      oldIds.size === newIds.size && [...oldIds].every((id) => newIds.has(id));

    if (setsEqual) {
      continue;
    }

    changes.push({
      date,
      removedWorkItemIds,
      addedItems,
      reconcileToNewIds: [...newIds],
    });
  }

  return changes;
}

export const WEEK_PLAN_DAY_SYNC_STATUSES = ["sent", "acknowledged", "active"] as const;
