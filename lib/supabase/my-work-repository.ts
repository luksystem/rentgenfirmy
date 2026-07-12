"use client";

import type {
  CreateWorkItemInput,
  WorkItemAcceptanceInput,
  WorkItemCompleteInput,
  WorkItemDetail,
  WorkItemView,
} from "@/lib/my-work/types";

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error ?? fallbackError);
  }
  return payload as T;
}

export async function fetchMyWorkItems(options?: {
  scope?: "my" | "team";
  assignedUserId?: string;
  sync?: boolean;
}): Promise<WorkItemView[]> {
  const params = new URLSearchParams();
  if (options?.scope) params.set("scope", options.scope);
  if (options?.assignedUserId) params.set("assignedUserId", options.assignedUserId);
  if (options?.sync === false) params.set("sync", "false");
  const query = params.toString();
  const response = await fetch(`/api/my-work/items${query ? `?${query}` : ""}`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ items: WorkItemView[] }>(
    response,
    "Nie udało się wczytać zadań.",
  );
  return payload.items;
}

export async function fetchWorkItemDetail(id: string): Promise<WorkItemDetail> {
  const response = await fetch(`/api/my-work/items/${id}`, { credentials: "include" });
  const payload = await parseJsonResponse<{ detail: WorkItemDetail }>(
    response,
    "Nie udało się wczytać szczegółów zadania.",
  );
  return payload.detail;
}

export async function createWorkItem(input: CreateWorkItemInput): Promise<WorkItemView> {
  const response = await fetch("/api/my-work/items", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ item: WorkItemView }>(
    response,
    "Nie udało się utworzyć zadania.",
  );
  return payload.item;
}

export async function sendWorkItem(id: string): Promise<WorkItemDetail> {
  const response = await fetch(`/api/my-work/items/${id}/send`, {
    method: "POST",
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ detail: WorkItemDetail }>(
    response,
    "Nie udało się wysłać zadania.",
  );
  return payload.detail;
}

export async function recordWorkItemAcceptance(
  id: string,
  input: WorkItemAcceptanceInput,
): Promise<WorkItemDetail> {
  const response = await fetch(`/api/my-work/items/${id}/acceptance`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ detail: WorkItemDetail }>(
    response,
    "Nie udało się zapisać przyjęcia zadania.",
  );
  return payload.detail;
}

export async function completeWorkItem(
  id: string,
  input: WorkItemCompleteInput,
): Promise<WorkItemDetail> {
  const response = await fetch(`/api/my-work/items/${id}/complete`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ detail: WorkItemDetail }>(
    response,
    "Nie udało się zamknąć zadania.",
  );
  return payload.detail;
}

export async function verifyWorkItem(id: string): Promise<WorkItemDetail> {
  const response = await fetch(`/api/my-work/items/${id}/verify`, {
    method: "POST",
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ detail: WorkItemDetail }>(
    response,
    "Nie udało się zatwierdzić wykonania.",
  );
  return payload.detail;
}

export async function updateWorkItemStatus(
  id: string,
  status: string,
): Promise<WorkItemDetail> {
  const response = await fetch(`/api/my-work/items/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const payload = await parseJsonResponse<{ detail: WorkItemDetail }>(
    response,
    "Nie udało się zaktualizować statusu.",
  );
  return payload.detail;
}

export async function addWorkItemComment(id: string, body: string): Promise<WorkItemDetail> {
  const response = await fetch(`/api/my-work/items/${id}/comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const payload = await parseJsonResponse<{ detail: WorkItemDetail }>(
    response,
    "Nie udało się dodać komentarza.",
  );
  return payload.detail;
}

export async function syncMyWorkItems(): Promise<WorkItemView[]> {
  const response = await fetch("/api/my-work/sync", {
    method: "POST",
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ items: WorkItemView[] }>(
    response,
    "Nie udało się zsynchronizować zadań.",
  );
  return payload.items;
}

export async function startWorkItem(id: string): Promise<WorkItemDetail> {
  const response = await fetch(`/api/my-work/items/${id}/start`, {
    method: "POST",
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ detail: WorkItemDetail }>(
    response,
    "Nie udało się rozpocząć zadania.",
  );
  return payload.detail;
}
