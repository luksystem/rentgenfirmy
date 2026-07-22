"use client";

import type {
  MonthlyReviewAdminDetail,
  MonthlyReviewAdminListRow,
  MonthlyReviewDecision,
  MonthlyReviewDecisionStatus,
  MonthlyReviewSelfView,
  MonthlyReviewTeamQueueRow,
} from "@/lib/monthly-reviews/types";
import type { MonthlyReviewSettings } from "@/lib/monthly-reviews/settings";

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error ?? fallbackError);
  }
  return payload as T;
}

export type MonthlyReviewHoursContext = {
  snapshot: Record<string, unknown>;
  text: string;
  periodMonthLabel: string;
};

export async function fetchMonthlyReviewHoursContext(employeeId?: string): Promise<MonthlyReviewHoursContext> {
  const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : "";
  const response = await fetch(`/api/monthly-reviews/hours-context${query}`, { credentials: "include" });
  return parseJsonResponse<MonthlyReviewHoursContext>(response, "Nie udało się wczytać kontekstu godzin.");
}

export async function fetchMyMonthlyReview(): Promise<MonthlyReviewSelfView> {
  const response = await fetch("/api/monthly-reviews/self", { credentials: "include" });
  const payload = await parseJsonResponse<{ view: MonthlyReviewSelfView }>(
    response,
    "Nie udało się wczytać oceny miesięcznej.",
  );
  return payload.view;
}

export async function submitMyselfAssessment(input: {
  rating: number;
  comment: string;
}): Promise<MonthlyReviewSelfView> {
  const response = await fetch("/api/monthly-reviews/self", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ view: MonthlyReviewSelfView }>(
    response,
    "Nie udało się zapisać samooceny.",
  );
  return payload.view;
}

export async function fetchTeamMonthlyReviewQueue(): Promise<MonthlyReviewTeamQueueRow[]> {
  const response = await fetch("/api/monthly-reviews/team", { credentials: "include" });
  const payload = await parseJsonResponse<{ items: MonthlyReviewTeamQueueRow[] }>(
    response,
    "Nie udało się wczytać kolejki ocen.",
  );
  return payload.items;
}

export async function submitManagerAssessment(input: {
  employeeId: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const response = await fetch("/api/monthly-reviews/manager", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await parseJsonResponse(response, "Nie udało się zapisać oceny.");
}

export async function fetchAdminMonthlyReviewList(periodMonth?: string): Promise<MonthlyReviewAdminListRow[]> {
  const query = periodMonth ? `?month=${encodeURIComponent(periodMonth)}` : "";
  const response = await fetch(`/api/admin/monthly-reviews${query}`, { credentials: "include" });
  const payload = await parseJsonResponse<{ items: MonthlyReviewAdminListRow[] }>(
    response,
    "Nie udało się wczytać listy ocen.",
  );
  return payload.items;
}

export async function fetchAdminMonthlyReviewDetail(reviewId: string): Promise<MonthlyReviewAdminDetail> {
  const response = await fetch(`/api/admin/monthly-reviews/${reviewId}`, { credentials: "include" });
  const payload = await parseJsonResponse<{ detail: MonthlyReviewAdminDetail }>(
    response,
    "Nie udało się wczytać szczegółów oceny.",
  );
  return payload.detail;
}

export async function saveMonthlyReviewDecision(
  reviewId: string,
  input: { status: MonthlyReviewDecisionStatus; amount: number | null; note: string },
): Promise<MonthlyReviewDecision> {
  const response = await fetch(`/api/admin/monthly-reviews/${reviewId}/decision`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ decision: MonthlyReviewDecision }>(
    response,
    "Nie udało się zapisać decyzji.",
  );
  return payload.decision;
}

export async function shareAiReportWithEmployee(reviewId: string): Promise<void> {
  const response = await fetch(`/api/admin/monthly-reviews/${reviewId}/share-ai-report`, {
    method: "POST",
    credentials: "include",
  });
  await parseJsonResponse(response, "Nie udało się udostępnić raportu.");
}

export async function resetManagerAssessment(reviewId: string): Promise<void> {
  const response = await fetch(`/api/admin/monthly-reviews/${reviewId}/reset-manager-assessment`, {
    method: "POST",
    credentials: "include",
  });
  await parseJsonResponse(response, "Nie udało się cofnąć oceny managera.");
}

export async function fetchMonthlyReviewSettings(): Promise<MonthlyReviewSettings> {
  const response = await fetch("/api/settings/monthly-review", { credentials: "include" });
  const payload = await parseJsonResponse<{ settings: MonthlyReviewSettings }>(
    response,
    "Nie udało się wczytać ustawień.",
  );
  return payload.settings;
}

export async function saveMonthlyReviewSettings(
  settings: MonthlyReviewSettings,
): Promise<MonthlyReviewSettings> {
  const response = await fetch("/api/settings/monthly-review", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  const payload = await parseJsonResponse<{ settings: MonthlyReviewSettings }>(
    response,
    "Nie udało się zapisać ustawień.",
  );
  return payload.settings;
}
