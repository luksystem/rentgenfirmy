"use client";

import type {
  AcceptPlanSuggestionsInput,
  ActiveTimerView,
  CreateTimeEntryInput,
  EnsureTimesheetInput,
  PlanTimeSuggestion,
  RejectTimesheetInput,
  StartTimerInput,
  StopTimerInput,
  SubmitTimesheetInput,
  TimeEntryFilters,
  TimeEntryLog,
  TimeEntryView,
  TimesheetFilters,
  TimesheetView,
  TeamTimesheetOverviewRow,
  TimeTrackingMeta,
  UpdateTimeEntryInput,
} from "@/lib/time-tracking/types";
import type { TimesheetSummary } from "@/lib/time-tracking/timesheet-summary";
import type { TeamPeriodDetail } from "@/lib/time-tracking/team-period-detail";

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

function buildTimesheetQuery(filters: TimesheetFilters = {}, ensure = false): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.status) params.set("status", filters.status);
  if (filters.periodType) params.set("periodType", filters.periodType);
  if (ensure) params.set("ensure", "1");
  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildSummaryQuery(
  filters: {
    dateFrom: string;
    dateTo: string;
    periodType: "week" | "month";
    userId?: string;
  },
  ensure = false,
): string {
  const params = new URLSearchParams();
  params.set("dateFrom", filters.dateFrom);
  params.set("dateTo", filters.dateTo);
  params.set("periodType", filters.periodType);
  if (filters.userId) params.set("userId", filters.userId);
  if (ensure) params.set("ensure", "1");
  return `?${params.toString()}`;
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

export async function fetchTimesheets(filters?: TimesheetFilters): Promise<TimesheetView[]> {
  const response = await fetch(`/api/time-tracking/timesheets${buildTimesheetQuery(filters)}`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ timesheets: TimesheetView[] }>(
    response,
    "Nie udało się wczytać arkuszy czasu.",
  );
  return payload.timesheets;
}

export async function ensureTimesheet(input: EnsureTimesheetInput): Promise<TimesheetView> {
  const response = await fetch(
    `/api/time-tracking/timesheets${buildTimesheetQuery(
      {
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        periodType: input.periodType,
        userId: input.userId,
      },
      true,
    )}`,
    { credentials: "include" },
  );
  const payload = await parseJsonResponse<{ timesheet: TimesheetView }>(
    response,
    "Nie udało się przygotować arkusza czasu.",
  );
  return payload.timesheet;
}

export async function fetchTimesheetSummary(
  filters: {
    dateFrom: string;
    dateTo: string;
    periodType: "week" | "month";
    userId?: string;
  },
  ensure = false,
): Promise<TimesheetSummary> {
  const response = await fetch(
    `/api/time-tracking/summary${buildSummaryQuery(filters, ensure)}`,
    { credentials: "include" },
  );
  const payload = await parseJsonResponse<{ summary: TimesheetSummary }>(
    response,
    "Nie udało się wczytać zestawienia czasu.",
  );
  return payload.summary;
}

export async function fetchTeamTimesheetOverview(filters: {
  dateFrom: string;
  dateTo: string;
  periodType: "week" | "month";
}): Promise<TeamTimesheetOverviewRow[]> {
  const params = new URLSearchParams();
  params.set("dateFrom", filters.dateFrom);
  params.set("dateTo", filters.dateTo);
  params.set("periodType", filters.periodType);
  const response = await fetch(`/api/time-tracking/timesheets/team-overview?${params.toString()}`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ rows: TeamTimesheetOverviewRow[] }>(
    response,
    "Nie udało się wczytać zestawienia zespołu.",
  );
  return payload.rows;
}

export async function fetchTeamPeriodDetail(filters: {
  dateFrom: string;
  dateTo: string;
  periodType: "week" | "month";
}): Promise<TeamPeriodDetail> {
  const params = new URLSearchParams();
  params.set("dateFrom", filters.dateFrom);
  params.set("dateTo", filters.dateTo);
  params.set("periodType", filters.periodType);
  const response = await fetch(`/api/time-tracking/timesheets/team-detail?${params.toString()}`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ detail: TeamPeriodDetail }>(
    response,
    "Nie udało się wczytać szczegółowego zestawienia zespołu.",
  );
  return payload.detail;
}

export async function submitTimesheet(
  id: string,
  input: SubmitTimesheetInput = {},
): Promise<TimesheetView> {
  const response = await fetch(`/api/time-tracking/timesheets/${id}/submit`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ timesheet: TimesheetView }>(
    response,
    "Nie udało się wysłać arkusza do akceptacji.",
  );
  return payload.timesheet;
}

export async function approveTimesheet(id: string): Promise<TimesheetView> {
  const response = await fetch(`/api/time-tracking/timesheets/${id}/approve`, {
    method: "POST",
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ timesheet: TimesheetView }>(
    response,
    "Nie udało się zaakceptować arkusza.",
  );
  return payload.timesheet;
}

export async function rejectTimesheet(id: string, input: RejectTimesheetInput): Promise<TimesheetView> {
  const response = await fetch(`/api/time-tracking/timesheets/${id}/reject`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ timesheet: TimesheetView }>(
    response,
    "Nie udało się odrzucić arkusza.",
  );
  return payload.timesheet;
}

export async function fetchPlanTimeSuggestions(params: {
  dateFrom: string;
  dateTo: string;
}): Promise<PlanTimeSuggestion[]> {
  const search = new URLSearchParams({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  const response = await fetch(`/api/time-tracking/plan-suggestions?${search.toString()}`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ suggestions: PlanTimeSuggestion[] }>(
    response,
    "Nie udało się wczytać propozycji z planu zasobów.",
  );
  return payload.suggestions;
}

export async function acceptPlanTimeSuggestions(
  input: AcceptPlanSuggestionsInput,
): Promise<TimeEntryView[]> {
  const response = await fetch("/api/time-tracking/plan-suggestions/accept", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ entries: TimeEntryView[] }>(
    response,
    "Nie udało się zaakceptować propozycji z planu.",
  );
  return payload.entries;
}
