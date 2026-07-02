export const TOUCH_DRAG_THRESHOLD_PX = 8;

export function resolveKanbanColumnId(clientX: number, clientY: number) {
  const target = document.elementFromPoint(clientX, clientY);
  return target?.closest("[data-column-id]")?.getAttribute("data-column-id") ?? null;
}
