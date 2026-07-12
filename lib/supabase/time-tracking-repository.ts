"use client";

import type {
  ActiveTimerView,
  CreateTimeEntryInput,
  StartTimerInput,
  StopTimerInput,
  TimeEntryFilters,
  TimeEntryLog,
  TimeEntryView,
  TimeTrackingMeta,
  UpdateTimeEntryInput,
} from "@/lib/time-tracking/types";

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error ?? fallbackError);
  }
  return payload as T;
}

function buildQuery(filters: TimeEntryFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchTimeTrackingMeta(): Promise<TimeTrackingMeta> {
  const response = await fetch("/api/time-tracking/meta", { credentials: "include" });
  const payload = await parseJsonResponse<{ meta: TimeTrackingMeta }>(
    response,
    "Nie udało się wczytać ustawień czasu pracy.",
  );
  return payload.meta;
}

export async function fetchTimeEntries(filters?: TimeEntryFilters): Promise<TimeEntryView[]> {
  const response = await fetch(`/api/time-tracking/entries${buildQuery(filters)}`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ entries: TimeEntryView[] }>(
    response,
    "Nie udało się wczytać wpisów czasu.",
  );
  return payload.entries;
}

export async function createTimeEntry(input: CreateTimeEntryInput): Promise<TimeEntryView> {
  const response = await fetch("/api/time-tracking/entries", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ entry: TimeEntryView }>(
    response,
    "Nie udało się dodać wpisu czasu.",
  );
  return payload.entry;
}

export async function updateTimeEntry(
  id: string,
  input: UpdateTimeEntryInput,
): Promise<TimeEntryView> {
  const response = await fetch(`/api/time-tracking/entries/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ entry: TimeEntryView }>(
    response,
    "Nie udało się zaktualizować wpisu czasu.",
  );
  return payload.entry;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const response = await fetch(`/api/time-tracking/entries/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJsonResponse<{ ok: boolean }>(response, "Nie udało się usunąć wpisu czasu.");
}

export async function fetchActiveTimer(): Promise<ActiveTimerView | null> {
  const response = await fetch("/api/time-tracking/timer", { credentials: "include" });
  const payload = await parseJsonResponse<{ timer: ActiveTimerView | null }>(
    response,
    "Nie udało się wczytać timera.",
  );
  return payload.timer;
}

export async function startTimer(input: StartTimerInput): Promise<ActiveTimerView> {
  const response = await fetch("/api/time-tracking/timer/start", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ timer: ActiveTimerView }>(
    response,
    "Nie udało się uruchomić timera.",
  );
  return payload.timer;
}

export async function pauseTimer(): Promise<ActiveTimerView> {
  const response = await fetch("/api/time-tracking/timer/pause", {
    method: "POST",
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ timer: ActiveTimerView }>(
    response,
    "Nie udało się wstrzymać timera.",
  );
  return payload.timer;
}

export async function resumeTimer(): Promise<ActiveTimerView> {
  const response = await fetch("/api/time-tracking/timer/resume", {
    method: "POST",
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ timer: ActiveTimerView }>(
    response,
    "Nie udało się wznowić timera.",
  );
  return payload.timer;
}

export async function stopTimer(input?: StopTimerInput): Promise<TimeEntryView> {
  const response = await fetch("/api/time-tracking/timer/stop", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  const payload = await parseJsonResponse<{ entry: TimeEntryView }>(
    response,
    "Nie udało się zatrzymać timera.",
  );
  return payload.entry;
}

export async function cancelTimer(): Promise<void> {
  const response = await fetch("/api/time-tracking/timer", {
    method: "DELETE",
    credentials: "include",
  });
  await parseJsonResponse<{ ok: boolean }>(response, "Nie udało się anulować timera.");
}

export async function fetchTimeEntryLogs(entryId: string): Promise<TimeEntryLog[]> {
  const response = await fetch(`/api/time-tracking/entries/${entryId}/logs`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ logs: TimeEntryLog[] }>(
    response,
    "Nie udało się wczytać historii wpisu.",
  );
  return payload.logs;
}
