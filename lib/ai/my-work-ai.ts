import type { WorkItemView } from "@/lib/my-work/types";
import type { WorkPlanView } from "@/lib/my-work/plan-types";
import type {
  WorkDaySummaryAiResponse,
  WorkRiskAnalysisResponse,
  WorkTaskAiSuggestion,
  WorkTaskAiSuggestionsResponse,
} from "@/lib/my-work/ai-types";
import {
  buildRuleBasedDaySummary,
  buildRuleBasedRiskAnalysis,
  buildRuleBasedTaskSuggestions,
} from "@/lib/my-work/suggestion-provider";

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

function asPriority(value: unknown): WorkTaskAiSuggestion["priority"] {
  const text = asString(value);
  if (text === "low" || text === "normal" || text === "high" || text === "urgent") {
    return text;
  }
  return "normal";
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

function summarizeItemsForPrompt(items: WorkItemView[]) {
  return items.slice(0, 30).map((item) => ({
    title: item.title,
    status: item.status,
    priority: item.priority,
    project: item.projectName,
    due: item.plannedEnd ?? item.dueDate,
    blocked: item.blockedReason,
  }));
}

export async function generateWorkDaySummaryDraft(input: {
  items: WorkItemView[];
  employeeName: string;
  sessionDate: string;
}): Promise<WorkDaySummaryAiResponse> {
  try {
    const row = await callOpenAiJson(
      `Jesteś asystentem operacyjnym w firmie smart home/BMS. Zwróć JSON:
{
  "draft": "string — 2-4 zdania podsumowania dnia po polsku, pierwsza osoba",
  "highlights": ["string — co udało się zrobić"],
  "openItems": ["string — co zostało otwarte"]
}`,
      `Pracownik: ${input.employeeName}
Data: ${input.sessionDate}
Zadania: ${JSON.stringify(summarizeItemsForPrompt(input.items))}`,
    );

    const draft = asString(row.draft);
    if (!draft) {
      throw new Error("Pusty szkic AI.");
    }

    return {
      draft,
      highlights: Array.isArray(row.highlights)
        ? row.highlights.map((entry) => asString(entry)).filter(Boolean)
        : [],
      openItems: Array.isArray(row.openItems)
        ? row.openItems.map((entry) => asString(entry)).filter(Boolean)
        : [],
      source: "ai",
    };
  } catch {
    return buildRuleBasedDaySummary(input.items);
  }
}

export async function generateWorkTaskSuggestions(input: {
  items: WorkItemView[];
  managerName: string;
  assignedUserName?: string;
  contextNote?: string;
}): Promise<WorkTaskAiSuggestionsResponse> {
  try {
    const row = await callOpenAiJson(
      `Jesteś managerem operacyjnym. Zaproponuj 1-4 konkretne zadania wewnętrzne (work items).
Zwróć JSON:
{
  "summary": "string — krótkie uzasadnienie zestawu",
  "suggestions": [{
    "title": "string",
    "description": "string",
    "expectedResult": "string",
    "priority": "low|normal|high|urgent",
    "reason": "string — dlaczego AI to sugeruje",
    "dueDate": "YYYY-MM-DD lub null"
  }]
}`,
      `Manager: ${input.managerName}
Pracownik docelowy: ${input.assignedUserName ?? "nie podano"}
Kontekst: ${input.contextNote ?? ""}
Otwarte zadania zespołu: ${JSON.stringify(summarizeItemsForPrompt(input.items))}`,
    );

    const suggestionsRaw = Array.isArray(row.suggestions) ? row.suggestions : [];
    const suggestions: WorkTaskAiSuggestion[] = suggestionsRaw
      .map((entry): WorkTaskAiSuggestion | null => {
        if (!entry || typeof entry !== "object") return null;
        const rowEntry = entry as Record<string, unknown>;
        const title = asString(rowEntry.title);
        if (!title) return null;
        return {
          title,
          description: asString(rowEntry.description),
          expectedResult: asString(rowEntry.expectedResult),
          priority: asPriority(rowEntry.priority),
          reason: asString(rowEntry.reason, "Sugestia AI na podstawie bieżącego obciążenia."),
          dueDate: asString(rowEntry.dueDate) || null,
        };
      })
      .filter((entry): entry is WorkTaskAiSuggestion => entry != null);

    if (suggestions.length === 0) {
      throw new Error("Brak sugestii AI.");
    }

    return {
      suggestions: suggestions.slice(0, 4),
      summary: asString(row.summary, "Sugestie zadań na podstawie bieżącego obciążenia."),
      source: "ai",
    };
  } catch {
    const suggestions = buildRuleBasedTaskSuggestions(input.items);
    return {
      suggestions,
      summary: "Sugestie oparte na regułach (zaległości, blokady, weryfikacja).",
      source: "rules",
    };
  }
}

export async function analyzeWorkPlanRisks(input: {
  items: WorkItemView[];
  plan: WorkPlanView | null;
  employeeName: string;
}): Promise<WorkRiskAnalysisResponse> {
  try {
    const row = await callOpenAiJson(
      `Oceń ryzyka operacyjne planu pracy. Zwróć JSON po polsku:
{
  "riskNotes": "string — 2-3 zdania dla managera/pracownika",
  "risks": [{ "title": "string", "severity": "low|medium|high", "detail": "string" }],
  "recommendations": ["string"]
}`,
      `Pracownik: ${input.employeeName}
Plan: ${input.plan ? `${input.plan.dateFrom} – ${input.plan.dateTo}, status ${input.plan.status}` : "brak"}
Zadania: ${JSON.stringify(summarizeItemsForPrompt(input.items))}`,
    );

    const riskNotes = asString(row.riskNotes);
    if (!riskNotes) {
      throw new Error("Pusta analiza ryzyka.");
    }

    const risks = Array.isArray(row.risks)
      ? row.risks
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const riskRow = entry as Record<string, unknown>;
            const title = asString(riskRow.title);
            if (!title) return null;
            const severityRaw = asString(riskRow.severity);
            const severity =
              severityRaw === "low" || severityRaw === "medium" || severityRaw === "high"
                ? severityRaw
                : "medium";
            return { title, severity, detail: asString(riskRow.detail) };
          })
          .filter((entry): entry is WorkRiskAnalysisResponse["risks"][number] => entry != null)
      : [];

    return {
      riskNotes,
      risks,
      recommendations: Array.isArray(row.recommendations)
        ? row.recommendations.map((entry) => asString(entry)).filter(Boolean)
        : [],
      source: "ai",
    };
  } catch {
    return buildRuleBasedRiskAnalysis(input.items, input.plan);
  }
}
