import type { WorkItemView } from "@/lib/my-work/types";

function effectiveDueKey(item: WorkItemView) {
  return item.plannedEnd ?? item.dueDate ?? "";
}

/** Stabilna kolejność listy — ten sam zestaw danych nie „skacze” między odświeżeniami. */
export function sortWorkItemsStable(items: WorkItemView[]): WorkItemView[] {
  return [...items].sort((a, b) => {
    const dueA = effectiveDueKey(a);
    const dueB = effectiveDueKey(b);
    if (dueA !== dueB) {
      if (!dueA) return 1;
      if (!dueB) return -1;
      return dueA.localeCompare(dueB);
    }
    const titleCmp = a.title.localeCompare(b.title, "pl");
    if (titleCmp !== 0) return titleCmp;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
