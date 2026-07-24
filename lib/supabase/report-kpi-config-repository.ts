"use client";

import type { ComparisonPeriodKind, ReportKpiConfigRow } from "@/lib/report-kpi/types";

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? fallbackError);
  }
  return payload as T;
}

export async function fetchReportKpiConfigAdmin(): Promise<ReportKpiConfigRow[]> {
  const response = await fetch("/api/raport-firmy/kpi-config", { credentials: "include" });
  const payload = await parseJsonResponse<{ items: ReportKpiConfigRow[] }>(
    response,
    "Nie udało się wczytać konfiguracji KPI.",
  );
  return payload.items;
}

export async function updateReportKpiConfigAdmin(
  kpiKey: string,
  input: {
    enabled?: boolean;
    warningThreshold?: number | null;
    criticalThreshold?: number | null;
    comparisonPeriod?: ComparisonPeriodKind;
    sortOrder?: number;
  },
): Promise<ReportKpiConfigRow> {
  const response = await fetch("/api/raport-firmy/kpi-config", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kpiKey, ...input }),
  });
  const payload = await parseJsonResponse<{ item: ReportKpiConfigRow }>(
    response,
    "Nie udało się zapisać ustawienia KPI.",
  );
  return payload.item;
}
