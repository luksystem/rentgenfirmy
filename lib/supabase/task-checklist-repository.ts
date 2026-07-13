"use client";

import type {
  CreateTaskChecklistItemInput,
  TaskChecklistItem,
  TaskChecklistParent,
  UpdateTaskChecklistItemInput,
} from "@/lib/task-checklist/types";

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error ?? fallbackError);
  }
  return payload as T;
}

function parentQuery(parent: TaskChecklistParent) {
  if (parent.kind === "work_item") {
    return `workItemId=${encodeURIComponent(parent.id)}`;
  }
  return `resourcePlanItemId=${encodeURIComponent(parent.id)}`;
}

export async function fetchTaskChecklistItems(parent: TaskChecklistParent): Promise<TaskChecklistItem[]> {
  const response = await fetch(`/api/task-checklist?${parentQuery(parent)}`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ items: TaskChecklistItem[] }>(
    response,
    "Nie udało się wczytać podzadań.",
  );
  return payload.items;
}

export async function createTaskChecklistItem(
  input: CreateTaskChecklistItemInput,
): Promise<TaskChecklistItem> {
  const response = await fetch("/api/task-checklist", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ item: TaskChecklistItem }>(
    response,
    "Nie udało się dodać podzadania.",
  );
  return payload.item;
}

export async function updateTaskChecklistItem(
  id: string,
  input: UpdateTaskChecklistItemInput,
): Promise<TaskChecklistItem> {
  const response = await fetch(`/api/task-checklist/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ item: TaskChecklistItem }>(
    response,
    "Nie udało się zaktualizować podzadania.",
  );
  return payload.item;
}

export async function deleteTaskChecklistItem(id: string): Promise<void> {
  const response = await fetch(`/api/task-checklist/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJsonResponse<{ ok: boolean }>(response, "Nie udało się usunąć podzadania.");
}
