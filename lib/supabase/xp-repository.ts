"use client";

import type {
  XpCriterion,
  XpEmployeeAdminDetail,
  XpEmployeeSummary,
  XpLeaderboardRow,
  XpRedemption,
} from "@/lib/xp/types";
import type { XpSettings } from "@/lib/xp/settings";

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error ?? fallbackError);
  }
  return payload as T;
}

export async function fetchMyXpSummary(): Promise<XpEmployeeSummary> {
  const response = await fetch("/api/xp/me", { credentials: "include" });
  const payload = await parseJsonResponse<{ summary: XpEmployeeSummary }>(
    response,
    "Nie udało się wczytać punktów XP.",
  );
  return payload.summary;
}

export async function fetchXpLeaderboard(): Promise<XpLeaderboardRow[]> {
  const response = await fetch("/api/xp/leaderboard", { credentials: "include" });
  const payload = await parseJsonResponse<{ items: XpLeaderboardRow[] }>(
    response,
    "Nie udało się wczytać rankingu.",
  );
  return payload.items;
}

/** Katalog kryteriów widoczny dla każdego — "jak zdobyć punkty". */
export async function fetchXpCriteriaPublic(): Promise<XpCriterion[]> {
  const response = await fetch("/api/xp/criteria", { credentials: "include" });
  const payload = await parseJsonResponse<{ items: XpCriterion[] }>(
    response,
    "Nie udało się wczytać kryteriów.",
  );
  return payload.items;
}

export async function fetchXpCriteriaAdmin(): Promise<XpCriterion[]> {
  const response = await fetch("/api/admin/xp/criteria", { credentials: "include" });
  const payload = await parseJsonResponse<{ items: XpCriterion[] }>(
    response,
    "Nie udało się wczytać kryteriów.",
  );
  return payload.items;
}

export async function updateXpCriterionAdmin(
  criterionId: string,
  input: { points: number; isActive: boolean },
): Promise<void> {
  const response = await fetch(`/api/admin/xp/criteria/${criterionId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await parseJsonResponse(response, "Nie udało się zapisać kryterium.");
}

export async function fetchXpSettings(): Promise<XpSettings> {
  const response = await fetch("/api/settings/xp", { credentials: "include" });
  const payload = await parseJsonResponse<{ settings: XpSettings }>(
    response,
    "Nie udało się wczytać ustawień.",
  );
  return payload.settings;
}

export async function saveXpSettings(settings: XpSettings): Promise<XpSettings> {
  const response = await fetch("/api/settings/xp", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  const payload = await parseJsonResponse<{ settings: XpSettings }>(
    response,
    "Nie udało się zapisać ustawień.",
  );
  return payload.settings;
}

export async function fetchXpAdminEmployeeList(): Promise<XpLeaderboardRow[]> {
  const response = await fetch("/api/admin/xp/employees", { credentials: "include" });
  const payload = await parseJsonResponse<{ items: XpLeaderboardRow[] }>(
    response,
    "Nie udało się wczytać listy pracowników.",
  );
  return payload.items;
}

export async function fetchXpEmployeeDetailAdmin(employeeId: string): Promise<XpEmployeeAdminDetail> {
  const response = await fetch(`/api/admin/xp/employees/${employeeId}`, { credentials: "include" });
  const payload = await parseJsonResponse<{ detail: XpEmployeeAdminDetail }>(
    response,
    "Nie udało się wczytać szczegółów pracownika.",
  );
  return payload.detail;
}

export async function createXpRedemptionAdmin(
  employeeId: string,
  input: { pointsRedeemed: number; amount: number; note: string },
): Promise<XpRedemption> {
  const response = await fetch(`/api/admin/xp/employees/${employeeId}/redemptions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ redemption: XpRedemption }>(
    response,
    "Nie udało się utworzyć wymiany.",
  );
  return payload.redemption;
}

export async function markXpRedemptionPaidAdmin(employeeId: string, redemptionId: string): Promise<void> {
  const response = await fetch(
    `/api/admin/xp/employees/${employeeId}/redemptions/${redemptionId}/mark-paid`,
    { method: "POST", credentials: "include" },
  );
  await parseJsonResponse(response, "Nie udało się oznaczyć jako wypłacone.");
}
