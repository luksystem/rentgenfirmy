import {
  GOAL_PERIOD_TYPES,
  GOAL_LEVEL_LABELS,
  GOAL_REVIEW_OUTCOMES,
  type GoalAiAdviceAlternative,
  type GoalAiOngoingAdjustment,
  type GoalAiSuggestedStructure,
  type GoalLevel,
  type GoalMethodology,
  type GoalPeriodType,
  type GoalReviewOutcome,
} from "@/lib/goals/types";

export const GOAL_AI_MAX_INPUT_CHARS = 4_000;

export type GoalAiReviewContext = {
  statusLabel: string;
  progressPercent: number;
  daysRemaining: number;
  recentReviewsSummary: string;
};

export type GoalAiAdvice = {
  recommendedMethodologyCode: string | null;
  justification: string;
  alternatives: GoalAiAdviceAlternative[];
  isTooVague: boolean;
  vagueWarningReason: string | null;
  structure: GoalAiSuggestedStructure;
  ongoingAdjustment: GoalAiOngoingAdjustment | null;
};

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

function asNullableString(value: unknown): string | null {
  const text = asString(value);
  return text ? text : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function asReviewFrequency(value: unknown): GoalPeriodType {
  return typeof value === "string" && (GOAL_PERIOD_TYPES as readonly string[]).includes(value)
    ? (value as GoalPeriodType)
    : "monthly";
}

function normalizeAlternatives(
  value: unknown,
  validCodes: Set<string>,
): GoalAiAdviceAlternative[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: GoalAiAdviceAlternative[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const code = asString(row.code);
    const whenBetter = asString(row.whenBetter);
    if (code && validCodes.has(code) && whenBetter) {
      out.push({ code, whenBetter });
    }
  }
  return out;
}

function normalizeStructure(value: unknown): GoalAiSuggestedStructure {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const fieldsRaw =
    row.fields && typeof row.fields === "object" ? (row.fields as Record<string, unknown>) : {};
  const fields: Record<string, string> = {};
  for (const [key, fieldValue] of Object.entries(fieldsRaw)) {
    if (typeof fieldValue === "string") {
      fields[key] = fieldValue;
    } else if (Array.isArray(fieldValue)) {
      fields[key] = asStringArray(fieldValue).join("\n");
    } else if (fieldValue !== null && fieldValue !== undefined) {
      fields[key] = String(fieldValue);
    }
  }

  const kpisRaw = Array.isArray(row.kpis) ? row.kpis : [];
  const kpis = kpisRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const kpiRow = entry as Record<string, unknown>;
      const name = asString(kpiRow.name);
      if (!name) return null;
      return { name, target: asNumber(kpiRow.target), unit: asString(kpiRow.unit) };
    })
    .filter((entry): entry is { name: string; target: number; unit: string } => entry !== null);

  const budgetRaw =
    row.budgetEstimate && typeof row.budgetEstimate === "object"
      ? (row.budgetEstimate as Record<string, unknown>)
      : {};

  return {
    fields,
    kpis,
    monitoringApproach: asString(row.monitoringApproach),
    reviewFrequency: asReviewFrequency(row.reviewFrequency),
    risks: asStringArray(row.risks),
    initiatives: asStringArray(row.initiatives),
    tasks: asStringArray(row.tasks),
    resources: asStringArray(row.resources),
    budgetEstimate: {
      amount: asNumber(budgetRaw.amount),
      currency: asString(budgetRaw.currency, "PLN"),
      note: asString(budgetRaw.note),
    },
  };
}

function normalizeOngoingAdjustment(value: unknown): GoalAiOngoingAdjustment | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  const summary = asString(row.summary);
  if (!summary) {
    return null;
  }
  const statusSuggestionRaw = asNullableString(row.statusSuggestion);
  const statusSuggestion =
    statusSuggestionRaw &&
    (GOAL_REVIEW_OUTCOMES as readonly string[]).includes(statusSuggestionRaw)
      ? (statusSuggestionRaw as GoalReviewOutcome)
      : null;

  return {
    summary,
    recommendedActions: asStringArray(row.recommendedActions),
    statusSuggestion,
  };
}

function buildMethodologyCatalog(methodologies: GoalMethodology[]): string {
  return methodologies
    .map((entry, index) => {
      const fieldKeys = entry.fieldSchema.map((field) => field.key).join(", ") || "brak";
      return `${index + 1}. Kod: "${entry.code}" — ${entry.name}
   Opis: ${entry.shortDescription}
   Przeznaczenie: ${entry.purpose}
   Kiedy stosować: ${entry.whenToUse}
   Kiedy NIE stosować: ${entry.whenNotToUse}
   Klucze pól formularza (użyj TYCH kluczy w structure.fields): ${fieldKeys}`;
    })
    .join("\n\n");
}

function buildSystemPrompt(methodologies: GoalMethodology[], trigger: "create" | "review"): string {
  const reviewNote =
    trigger === "review"
      ? `\n\nTen wpis to AKTUALIZACJA w trakcie trwania już istniejącego celu (trigger = "review"), nie
tworzenie od nowa. Zamiast proponować całkiem nową metodologię, oceń, czy obecne tempo realizacji
jest zgodne z planem i zaproponuj konkretną korektę w polu "ongoingAdjustment" (patrz format
odpowiedzi w wiadomości użytkownika). Nadal wypełnij resztę struktury najlepiej jak potrafisz na
podstawie opisu, ale traktuj ongoingAdjustment jako główny cel tej odpowiedzi.`
      : "";

  return `Jesteś doradcą metodycznym w module "Tablica Celów" firmy instalującej systemy Smart Home / BMS.
Twoje zadanie: na podstawie opisu celu podanego przez użytkownika (w języku polskim) wybierz JEDNĄ
najlepszą metodologię wyznaczania i monitorowania celów z zamkniętej listy poniżej, uzasadnij wybór,
zaproponuj 1-2 sensowne alternatywy oraz zbuduj strukturę celu (pola metodologii, KPI, sposób
monitorowania, ryzyka, inicjatywy/zadania/zasoby/budżet orientacyjny).

Dostępne metodologie (wybieraj WYŁĄCZNIE z tej listy, używaj DOKŁADNIE podanych kodów):
${buildMethodologyCatalog(methodologies)}

Zasady:
- recommendedMethodologyCode musi być jednym z podanych kodów.
- alternatives.code musi być jednym z podanych kodów (różnym od recommendedMethodologyCode).
- structure.fields wypełnij używając kluczy pól WYBRANEJ metodologii (patrz katalog powyżej), wartości w języku polskim.
- Jeśli opis jest zbyt ogólny, niemierzalny lub nie da się z niego wyznaczyć sensownego celu — ustaw
  isTooVague=true i wyjaśnij dlaczego w vagueWarningReason, ale mimo to zaproponuj najlepszą możliwą
  strukturę na podstawie tego, co wiadomo.
- Bądź konkretny i praktyczny, unikaj ogólników. Kwoty budżetu podawaj w PLN, jeśli nie wynika inaczej.
- Odpowiadaj WYŁĄCZNIE poprawnym obiektem JSON, bez żadnego tekstu poza nim.${reviewNote}`;
}

function buildUserPrompt(input: {
  description: string;
  level?: GoalLevel;
  boardKindLabel?: string;
  trigger: "create" | "review";
  reviewContext?: GoalAiReviewContext;
}): string {
  const reviewContextBlock =
    input.trigger === "review" && input.reviewContext
      ? `\n\nAktualny stan celu (kontekst przeglądu):
- Status: ${input.reviewContext.statusLabel}
- Realizacja: ${input.reviewContext.progressPercent}%
- Dni do końca okresu: ${input.reviewContext.daysRemaining}
- Historia ostatnich przeglądów: ${input.reviewContext.recentReviewsSummary || "brak wcześniejszych przeglądów"}`
      : "";

  const ongoingAdjustmentField =
    input.trigger === "review"
      ? `,
  "ongoingAdjustment": {
    "summary": "string — krótka ocena, czy cel jest na dobrej drodze",
    "recommendedActions": ["string — konkretne działanie korygujące"],
    "statusSuggestion": "on_track"
  }`
      : "";

  return `Opis celu podany przez użytkownika:
"""
${input.description}
"""

Poziom celu: ${input.level ? GOAL_LEVEL_LABELS[input.level] : "nieznany"}
Typ tablicy: ${input.boardKindLabel ?? "nieznany"}${reviewContextBlock}

Odpowiedz WYŁĄCZNIE poprawnym JSON w formacie:
{
  "recommendedMethodologyCode": "kod_z_listy",
  "justification": "string — uzasadnienie wyboru metodologii",
  "alternatives": [{ "code": "inny_kod_z_listy", "whenBetter": "string — kiedy ta alternatywa byłaby lepsza" }],
  "isTooVague": false,
  "vagueWarningReason": null,
  "structure": {
    "fields": { "kluczPola": "wartość" },
    "kpis": [{ "name": "string", "target": 100, "unit": "%" }],
    "monitoringApproach": "string — jak monitorować postęp",
    "reviewFrequency": "weekly",
    "risks": ["string"],
    "initiatives": ["string"],
    "tasks": ["string"],
    "resources": ["string"],
    "budgetEstimate": { "amount": 0, "currency": "PLN", "note": "string" }
  }${ongoingAdjustmentField}
}`;
}

export async function generateGoalAiAdvice(input: {
  description: string;
  level?: GoalLevel;
  boardKindLabel?: string;
  methodologies: GoalMethodology[];
  trigger?: "create" | "review";
  reviewContext?: GoalAiReviewContext;
}): Promise<GoalAiAdvice> {
  const description = input.description.trim();
  const trigger = input.trigger ?? "create";
  if (!description) {
    throw new Error("Podaj opis celu do analizy przez AI.");
  }
  if (description.length > GOAL_AI_MAX_INPUT_CHARS) {
    throw new Error(`Opis jest zbyt długi (max ${GOAL_AI_MAX_INPUT_CHARS} znaków).`);
  }
  if (input.methodologies.length === 0) {
    throw new Error("Biblioteka metodologii jest pusta — brak podstaw do rekomendacji AI.");
  }

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
        { role: "system", content: buildSystemPrompt(input.methodologies, trigger) },
        {
          role: "user",
          content: buildUserPrompt({
            description,
            level: input.level,
            boardKindLabel: input.boardKindLabel,
            trigger,
            reviewContext: input.reviewContext,
          }),
        },
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
    throw new Error("OpenAI nie zwróciło propozycji.");
  }

  const parsed = extractJsonObject(content);
  const row = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};

  const validCodes = new Set(input.methodologies.map((entry) => entry.code));
  const recommendedRaw = asNullableString(row.recommendedMethodologyCode);
  const recommendedMethodologyCode = recommendedRaw && validCodes.has(recommendedRaw)
    ? recommendedRaw
    : null;

  return {
    recommendedMethodologyCode,
    justification: asString(row.justification),
    alternatives: normalizeAlternatives(row.alternatives, validCodes),
    isTooVague: asBoolean(row.isTooVague),
    vagueWarningReason: asNullableString(row.vagueWarningReason),
    structure: normalizeStructure(row.structure),
    ongoingAdjustment: trigger === "review" ? normalizeOngoingAdjustment(row.ongoingAdjustment) : null,
  };
}
