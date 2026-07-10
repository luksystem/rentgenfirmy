import {
  GOAL_LEVELS,
  GOAL_PERIOD_TYPES,
  GOAL_PRIORITIES,
  type GoalLevel,
  type GoalPeriodType,
  type GoalPriority,
} from "@/lib/goals/types";

export const GOAL_ASSISTANT_MAX_GOALS = 8;

export type GoalAssistantDraft = {
  title: string;
  description: string;
  methodologyCode: string | null;
  level: GoalLevel;
  priority: GoalPriority;
  periodType: GoalPeriodType;
  periodStart: string;
  periodEnd: string;
  isRecurring: boolean;
  /** Dla jakiej roli AI proponuje ten cel (tekst informacyjny, np. "Kierownik projektu"). */
  suggestedRole: string;
};

export type GoalAssistantMethodologyContext = {
  code: string;
  name: string;
  shortDescription: string;
  whenToUse: string;
};

function periodEndFor(periodType: GoalPeriodType, start: Date): string {
  const end = new Date(start);
  switch (periodType) {
    case "daily":
      break;
    case "weekly":
      end.setDate(end.getDate() + 6);
      break;
    case "monthly":
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      break;
    case "quarterly":
      end.setMonth(end.getMonth() + 3);
      end.setDate(end.getDate() - 1);
      break;
    case "annual":
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      break;
  }
  return end.toISOString().slice(0, 10);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeLevel(value: unknown): GoalLevel {
  return typeof value === "string" && (GOAL_LEVELS as readonly string[]).includes(value)
    ? (value as GoalLevel)
    : "team";
}

function normalizePriority(value: unknown): GoalPriority {
  return typeof value === "string" && (GOAL_PRIORITIES as readonly string[]).includes(value)
    ? (value as GoalPriority)
    : "normal";
}

function normalizePeriodType(value: unknown): GoalPeriodType {
  return typeof value === "string" && (GOAL_PERIOD_TYPES as readonly string[]).includes(value)
    ? (value as GoalPeriodType)
    : "monthly";
}

function normalizeDraft(
  entry: unknown,
  referenceDate: Date,
  methodologyCodes: Set<string>,
): GoalAssistantDraft | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const raw = entry as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return null;
  }
  const periodType = normalizePeriodType(raw.periodType);
  const rawMethodology = typeof raw.methodologyCode === "string" ? raw.methodologyCode.trim() : "";
  const periodStart = isIsoDate(raw.periodStart) ? raw.periodStart : referenceDate.toISOString().slice(0, 10);

  return {
    title,
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    methodologyCode: rawMethodology && methodologyCodes.has(rawMethodology) ? rawMethodology : null,
    level: normalizeLevel(raw.level),
    priority: normalizePriority(raw.priority),
    periodType,
    periodStart,
    periodEnd: isIsoDate(raw.periodEnd) ? raw.periodEnd : periodEndFor(periodType, new Date(periodStart)),
    isRecurring: raw.isRecurring === true,
    suggestedRole: typeof raw.suggestedRole === "string" ? raw.suggestedRole.trim() : "Zespół projektowy",
  };
}

function buildPrompt(
  input: {
    projectName: string;
    clientName: string | null;
    projectType: string;
    stageTitle: string | null;
    stageDescription: string | null;
    existingGoalTitles: string[];
  },
  referenceDate: Date,
  methodologies: GoalAssistantMethodologyContext[],
) {
  const today = referenceDate.toISOString().slice(0, 10);
  const methodologyCatalog = methodologies
    .map((entry) => `- ${entry.code}: ${entry.name} — ${entry.shortDescription} (kiedy stosować: ${entry.whenToUse})`)
    .join("\n");
  const existing = input.existingGoalTitles.length
    ? input.existingGoalTitles.map((title) => `- ${title}`).join("\n")
    : "(brak — dla tego projektu nie ustalono jeszcze żadnych celów)";

  return `Jesteś doradcą metodycznym pomagającym zespołom wyznaczać cele dla projektów wdrożeniowych.

Projekt: "${input.projectName}" (typ: ${input.projectType})${input.clientName ? `, klient: ${input.clientName}` : ""}
Aktywny etap procesu: ${input.stageTitle ?? "nieustalony"}
Opis etapu (kontekst dla Ciebie): ${input.stageDescription?.trim() || "(brak opisu etapu)"}
Dzisiejsza data: ${today}

Cele już ustalone dla tego projektu:
${existing}

Dostępne metodologie (wybierz najlepiej pasującą albo methodologyCode: null):
${methodologyCatalog}

Zadanie: zaproponuj do ${GOAL_ASSISTANT_MAX_GOALS} NOWYCH celów (nie powtarzaj celów już ustalonych), które warto ustalić na obecnym etapie projektu, biorąc pod uwagę opis etapu. Jeśli etap nie sugeruje potrzeby nowych celów, zwróć mniej propozycji lub jedną najważniejszą.

Dla każdego celu podaj:
- title: konkretny, mierzalny tytuł celu (nie ogólnik), max 140 znaków.
- description: rozwinięcie — czemu ten cel jest ważny na tym etapie.
- methodologyCode: najlepiej pasująca metodologia z listy, albo null.
- level: "company" | "team" | "individual".
- priority: "low" | "normal" | "high" | "critical".
- periodType: "daily" | "weekly" | "monthly" | "quarterly" | "annual" — dopasuj do horyzontu etapu.
- periodStart: YYYY-MM-DD (domyślnie ${today}).
- periodEnd: YYYY-MM-DD.
- isRecurring: true/false.
- suggestedRole: dla jakiej roli/osoby ten cel (np. "Kierownik projektu", "Zespół instalacyjny", "Handlowiec") — na podstawie opisu etapu.

Odpowiedz WYŁĄCZNIE poprawnym JSON:
{
  "goals": [
    {
      "title": "string",
      "description": "string",
      "methodologyCode": "string lub null",
      "level": "team",
      "priority": "normal",
      "periodType": "monthly",
      "periodStart": "YYYY-MM-DD",
      "periodEnd": "YYYY-MM-DD",
      "isRecurring": false,
      "suggestedRole": "string"
    }
  ]
}`;
}

export async function suggestGoalsForProject(input: {
  projectName: string;
  clientName: string | null;
  projectType: string;
  stageTitle: string | null;
  stageDescription: string | null;
  existingGoalTitles: string[];
  methodologies: GoalAssistantMethodologyContext[];
  referenceDate?: Date;
}): Promise<GoalAssistantDraft[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Brak klucza OPENAI_API_KEY w konfiguracji serwera.");
  }

  const referenceDate = input.referenceDate ?? new Date();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const methodologyCodes = new Set(input.methodologies.map((entry) => entry.code));

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
        {
          role: "system",
          content:
            "Zwracasz wyłącznie JSON zgodny ze schematem. Odpowiadasz po polsku. Proponujesz cele konkretne i " +
            "mierzalne, dopasowane do etapu procesu — nie ogólnikowe.",
        },
        { role: "user", content: buildPrompt(input, referenceDate, input.methodologies) },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      errorBody ? `OpenAI: ${errorBody.slice(0, 240)}` : `OpenAI zwróciło błąd HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI nie zwróciło treści odpowiedzi.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Nie udało się odczytać odpowiedzi AI.");
  }

  const goalsRaw =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>).goals
      : null;

  if (!Array.isArray(goalsRaw)) {
    throw new Error("Odpowiedź AI ma nieprawidłowy format.");
  }

  const goals = goalsRaw
    .map((entry) => normalizeDraft(entry, referenceDate, methodologyCodes))
    .filter((entry): entry is GoalAssistantDraft => entry !== null)
    .slice(0, GOAL_ASSISTANT_MAX_GOALS);

  return goals;
}
