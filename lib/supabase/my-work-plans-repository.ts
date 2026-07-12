"use client";

import type {
  AcknowledgeWeekPlanInput,
  CreateWeekPlanInput,
  EndDayInput,
  ReportObstacleInput,
  StartDayInput,
  UpdateWeekPlanInput,
  WorkDayContext,
  WorkPlanView,
} from "@/lib/my-work/plan-types";

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error ?? fallbackError);
  }
  return payload as T;
}

export async function fetchDayContext(sessionDate?: string): Promise<WorkDayContext> {
  const params = new URLSearchParams();
  if (sessionDate) params.set("date", sessionDate);
  const query = params.toString();
  const response = await fetch(`/api/my-work/day-context${query ? `?${query}` : ""}`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ context: WorkDayContext }>(
    response,
    "Nie udało się wczytać kontekstu dnia.",
  );
  return payload.context;
}

export async function startDaySession(input: StartDayInput = {}): Promise<WorkDayContext> {
  const response = await fetch("/api/my-work/day-sessions/start", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ context: WorkDayContext }>(
    response,
    "Nie udało się rozpocząć dnia.",
  );
  return payload.context;
}

export async function endDaySession(input: EndDayInput): Promise<WorkDayContext> {
  const response = await fetch("/api/my-work/day-sessions/end", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ context: WorkDayContext }>(
    response,
    "Nie udało się zakończyć dnia.",
  );
  return payload.context;
}

export async function fetchCurrentWeekPlan(assignedUserId?: string | null): Promise<WorkPlanView | null> {
  const params = new URLSearchParams();
  if (assignedUserId) {
    params.set("assignedUserId", assignedUserId);
  }
  const query = params.toString();
  const response = await fetch(`/api/my-work/plans/week${query ? `?${query}` : ""}`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ plan: WorkPlanView | null }>(
    response,
    "Nie udało się wczytać planu tygodnia.",
  );
  return payload.plan;
}

export async function createWeekPlan(input: CreateWeekPlanInput): Promise<WorkPlanView> {
  const response = await fetch("/api/my-work/plans/week", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ plan: WorkPlanView }>(
    response,
    "Nie udało się utworzyć planu tygodnia.",
  );
  return payload.plan;
}

export async function updateWeekPlan(planId: string, input: UpdateWeekPlanInput): Promise<WorkPlanView> {
  const response = await fetch(`/api/my-work/plans/${planId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ plan: WorkPlanView }>(
    response,
    "Nie udało się zapisać planu tygodnia.",
  );
  return payload.plan;
}

export async function sendWeekPlan(planId: string): Promise<WorkPlanView> {
  const response = await fetch(`/api/my-work/plans/${planId}/send`, {
    method: "POST",
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ plan: WorkPlanView }>(
    response,
    "Nie udało się wysłać planu.",
  );
  return payload.plan;
}

export async function acknowledgeWeekPlan(
  planId: string,
  input: AcknowledgeWeekPlanInput,
): Promise<WorkPlanView> {
  const response = await fetch(`/api/my-work/plans/${planId}/acknowledge`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ plan: WorkPlanView }>(
    response,
    "Nie udało się potwierdzić planu.",
  );
  return payload.plan;
}

export async function copyWeekPlanFromPrevious(assignedUserId: string): Promise<WorkPlanView> {
  const response = await fetch("/api/my-work/plans/week/copy-previous", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignedUserId }),
  });
  const payload = await parseJsonResponse<{ plan: WorkPlanView }>(
    response,
    "Nie udało się skopiować planu z poprzedniego tygodnia.",
  );
  return payload.plan;
}

export async function reportObstacle(input: ReportObstacleInput): Promise<{ id: string }> {
  const response = await fetch("/api/my-work/obstacles", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ obstacle: { id: string } }>(
    response,
    "Nie udało się zgłosić przeszkody.",
  );
  return payload.obstacle;
}
