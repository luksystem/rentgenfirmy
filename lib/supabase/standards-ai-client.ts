import type { CompanyStandardAiSettings } from "@/lib/standards/ai-settings";
import type { CompanyStandardRestructureResult } from "@/lib/ai/company-standard-restructure-generator";

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? fallbackError);
  }
  return payload as T;
}

export async function restructureCompanyStandardContent(
  draftText: string,
): Promise<CompanyStandardRestructureResult> {
  const response = await fetch("/api/standards/restructure", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftText }),
  });
  const payload = await parseJsonResponse<{ result: CompanyStandardRestructureResult }>(
    response,
    "Nie udało się uporządkować treści.",
  );
  return payload.result;
}

export async function fetchCompanyStandardAiSettings(): Promise<CompanyStandardAiSettings> {
  const response = await fetch("/api/admin/standards/ai-settings", { credentials: "include" });
  const payload = await parseJsonResponse<{ settings: CompanyStandardAiSettings }>(
    response,
    "Nie udało się wczytać ustawień AI.",
  );
  return payload.settings;
}

export async function saveCompanyStandardAiSettings(
  settings: CompanyStandardAiSettings,
): Promise<CompanyStandardAiSettings> {
  const response = await fetch("/api/admin/standards/ai-settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  const payload = await parseJsonResponse<{ settings: CompanyStandardAiSettings }>(
    response,
    "Nie udało się zapisać ustawień AI.",
  );
  return payload.settings;
}
