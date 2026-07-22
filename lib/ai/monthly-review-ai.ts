import type { MonthlyReviewAiReportContent, MonthlyReviewDecisionStatus } from "@/lib/monthly-reviews/types";
import { MONTHLY_REVIEW_DECISION_STATUSES } from "@/lib/monthly-reviews/types";
import {
  buildRuleBasedReconciliation,
  type ReconciliationInput,
} from "@/lib/monthly-reviews/reconciliation-provider";

const MAX_INPUT_CHARS = 6_000;

function extractJsonObject(content: string): unknown {
  let text = content.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI nie zwróciło poprawnego JSON.");
  }
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => asString(entry)).filter(Boolean) : [];
}

function asTier(value: unknown): MonthlyReviewDecisionStatus {
  const text = asString(value);
  return (MONTHLY_REVIEW_DECISION_STATUSES as readonly string[]).includes(text)
    ? (text as MonthlyReviewDecisionStatus)
    : "pending";
}

async function callOpenAiJson(system: string, user: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Brak klucza OPENAI_API_KEY w konfiguracji serwera.");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user.slice(0, MAX_INPUT_CHARS) },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      errorBody.trim()
        ? `OpenAI: ${errorBody.slice(0, 240)}`
        : `OpenAI zwróciło błąd HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI nie zwróciło odpowiedzi.");
  }

  const parsed = extractJsonObject(content);
  return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
}

export type MonthlyReviewReconciliationInput = ReconciliationInput & {
  hoursContextText: string;
};

export type MonthlyReviewReconciliationResult = {
  content: MonthlyReviewAiReportContent;
  source: "ai" | "rules";
};

export async function generateMonthlyReviewReconciliation(
  input: MonthlyReviewReconciliationInput,
): Promise<MonthlyReviewReconciliationResult> {
  try {
    const row = await callOpenAiJson(
      `Jesteś asystentem HR w firmie smart home/BMS. Zestawiasz samoocenę pracownika i ocenę
przełożonego za dany miesiąc, żeby pomóc administratorowi podjąć decyzję o premii/podwyżce.
Zwróć JSON:
{
  "summary": "string — 2-3 zdania podsumowania po polsku",
  "agreements": ["string — w czym oceny się zgadzają"],
  "discrepancies": ["string — w czym oceny się różnią"],
  "risks": ["string — ryzyka lub sygnały ostrzegawcze"],
  "recommendation": {
    "tier": "standard_bonus" | "raise_consider" | "talk_needed" | "no_action" | "other",
    "label": "string — krótka etykieta rekomendacji po polsku",
    "rationale": "string — uzasadnienie w 1-2 zdaniach"
  }
}`,
      `Pracownik: ${input.employeeName}
Miesiąc: ${input.periodMonthLabel}
Kontekst godzin: ${input.hoursContextText}
Samoocena pracownika: ${input.selfRating}/10 — "${input.selfComment}"
Ocena przełożonego: ${input.managerRating}/10 — "${input.managerComment}"`,
    );

    const summary = asString(row.summary);
    if (!summary) {
      throw new Error("Pusty raport AI.");
    }

    const recommendationRow =
      row.recommendation && typeof row.recommendation === "object"
        ? (row.recommendation as Record<string, unknown>)
        : {};

    return {
      content: {
        summary,
        agreements: asStringArray(row.agreements),
        discrepancies: asStringArray(row.discrepancies),
        risks: asStringArray(row.risks),
        recommendation: {
          tier: asTier(recommendationRow.tier),
          label: asString(recommendationRow.label),
          rationale: asString(recommendationRow.rationale),
        },
      },
      source: "ai",
    };
  } catch {
    return {
      content: buildRuleBasedReconciliation(input),
      source: "rules",
    };
  }
}
