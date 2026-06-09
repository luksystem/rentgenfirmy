import type { KanbanAuthorSide, KanbanTaskEvent, KanbanTaskEventType } from "@/lib/process/kanban-types";

export const KANBAN_TASK_EVENT_LABELS: Record<KanbanTaskEventType, string> = {
  created: "Utworzono zgłoszenie",
  closed: "Zamknięto zgłoszenie",
  reopened: "Ponownie otwarto zgłoszenie",
};

export function formatKanbanEventDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatKanbanEventAuthor(event: KanbanTaskEvent) {
  const side = event.authorSide === "client" ? "Klient" : "Zespół";
  if (event.authorName === "Nieznany") {
    return side;
  }
  return `${event.authorName} · ${side}`;
}

export function getKanbanTaskEvents(
  events: KanbanTaskEvent[],
  taskId: string,
  taskCreatedAt?: string,
) {
  const taskEvents = events
    .filter((event) => event.taskId === taskId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (taskEvents.some((event) => event.eventType === "created")) {
    return taskEvents;
  }

  if (!taskCreatedAt) {
    return taskEvents;
  }

  return [
    {
      id: `fallback-created-${taskId}`,
      taskId,
      eventType: "created" as const,
      authorName: "Zespół",
      authorSide: "team" as KanbanAuthorSide,
      createdAt: taskCreatedAt,
    },
    ...taskEvents,
  ];
}
