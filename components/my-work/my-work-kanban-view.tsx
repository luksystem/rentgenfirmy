"use client";

import { useMemo, useState } from "react";
import {
  KANBAN_COLUMN_GROUPS,
  defaultStatusForKanbanColumn,
  kanbanColumnForStatus,
  type KanbanColumnGroupId,
} from "@/lib/my-work/state-machine";
import type { WorkItemView } from "@/lib/my-work/types";
import { MyWorkTaskCard } from "@/components/my-work/my-work-task-card";
import { cn } from "@/lib/utils";

export function MyWorkKanbanView({
  items,
  onOpenItem,
  onMoveItem,
}: {
  items: WorkItemView[];
  onOpenItem: (id: string) => void;
  onMoveItem: (itemId: string, columnId: KanbanColumnGroupId) => Promise<void>;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverColumn, setHoverColumn] = useState<KanbanColumnGroupId | null>(null);

  const columns = useMemo(() => {
    const map = new Map<KanbanColumnGroupId, WorkItemView[]>();
    for (const group of KANBAN_COLUMN_GROUPS) {
      map.set(group.id, []);
    }
    for (const item of items) {
      const columnId = kanbanColumnForStatus(item.status);
      map.get(columnId)?.push(item);
    }
    return map;
  }, [items]);

  async function handleDrop(columnId: KanbanColumnGroupId) {
    if (!draggingId) return;
    const item = items.find((entry) => entry.id === draggingId);
    if (!item) return;
    const currentColumn = kanbanColumnForStatus(item.status);
    if (currentColumn === columnId) {
      setDraggingId(null);
      setHoverColumn(null);
      return;
    }
    try {
      await onMoveItem(draggingId, columnId);
    } finally {
      setDraggingId(null);
      setHoverColumn(null);
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {KANBAN_COLUMN_GROUPS.map((group) => {
        const columnItems = columns.get(group.id) ?? [];
        return (
          <div
            key={group.id}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface-muted/30",
              hoverColumn === group.id && "border-sky-500/50",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setHoverColumn(group.id);
            }}
            onDragLeave={() => setHoverColumn((current) => (current === group.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              void handleDrop(group.id);
            }}
          >
            <div className="border-b border-border px-3 py-2">
              <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
              <p className="text-xs text-muted">{columnItems.length}</p>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {columnItems.map((item) => (
                <MyWorkTaskCard
                  key={item.id}
                  item={item}
                  draggable
                  isDragging={draggingId === item.id}
                  onDragStart={() => setDraggingId(item.id)}
                  onOpen={() => onOpenItem(item.id)}
                />
              ))}
              {!columnItems.length ? (
                <p className="px-2 py-4 text-center text-xs text-muted">Pusto</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { defaultStatusForKanbanColumn };
