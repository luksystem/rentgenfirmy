import { GOAL_LEVELS, GOAL_PERIOD_TYPES, GOAL_PRIORITIES, type GoalLevel, type GoalPeriodType, type GoalPriority } from "@/lib/goals/types";

export const GOAL_AI_BULK_MAX_INPUT_CHARS = 12_000;
export const GOAL_AI_BULK_MAX_GOALS = 25;

export type GoalAiGeneratedDraft = {
  title: string;
  description: string;
  methodologyCode: string | null;
  level: GoalLevel;
  priority: GoalPriority;
  periodType: GoalPeriodType;
  periodStart: string;
  periodEnd: string;
  isRecurring: boolean;
};

export type GoalAiBulkMethodologyContext = {
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

function normalizeGeneratedGoal(
  entry: unknown,
  referenceDate: Date,
  methodologyCodes: Set<string>,
): GoalAiGeneratedDraft | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const raw = entry as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return null;
  }
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const periodType = normalizePeriodType(raw.periodType);
  const rawMethodology = typeof raw.methodologyCode === "string" ? raw.methodologyCode.trim() : "";
  const methodologyCode = rawMethodology && methodologyCodes.has(rawMethodology) ? rawMethodology : null;
  const periodStart = isIsoDate(raw.periodStart) ? raw.periodStart : referenceDate.toISOString().slice(0, 10);
  const periodEnd = isIsoDate(raw.periodEnd) ? raw.periodEnd : periodEndFor(periodType, new Date(periodStart));

  return {
    title,
    description,
    methodologyCode,
    level: normalizeLevel(raw.level),
    priority: normalizePriority(raw.priority),
    periodType,
    periodStart,
    periodEnd,
    isRecurring: raw.isRecurring === true,
  };
}

function buildPrompt(
  notesText: string,
  referenceDate: Date,
  methodologies: GoalAiBulkMethodologyContext[],
  boardKindLabel: string,
) {
  const today = referenceDate.toISOString().slice(0, 10);
  const methodologyCatalog = methodologies
    .map((entry) => `- ${entry.code}: ${entry.name} — ${entry.shortDescription} (kiedy stosować: ${entry.whenToUse})`)
    .join("\n");

  return `Jesteś doradcą metodycznym do wyznaczania celów firmowych (tablica typu "${boardKindLabel}"). Na podstawie wklejonej notatki wypisz WSZYSTKIE odrębne cele, jakie z niej wynikają.

Dzisiejsza data: ${today}

Dostępne metodologie (wybierz najlepiej pasującą albo zwróć methodologyCode: null, jeśli żadna nie pasuje):
${methodologyCatalog}

Zasady:
- Każdy odrębny cel/temat z notatki = osobny wpis. Nie łącz różnych celów w jeden.
- title: sformułuj tytuł celu ZGODNIE Z ZASADAMI DOBRZE ZDEFINIOWANEGO CELU — konkretny, mierzalny, z liczbą/wskaźnikiem/terminem jeśli to możliwe (np. "Zwiększyć konwersję ofert z 20% do 30% w Q3"), a nie ogólnikowe streszczenie notatki. Max 140 znaków.
- description: rozwinięcie celu — kontekst, dlaczego jest ważny, co obejmuje (na podstawie notatki, nie zgaduj faktów, których nie ma w tekście).
- methodologyCode: kod metodologii z listy powyżej najlepiej pasującej do tego celu, albo null.
- level: "company" | "team" | "individual" — poziom celu (domyślnie "team", jeśli notatka nie precyzuje).
- priority: "low" | "normal" | "high" | "critical".
- periodType: "daily" | "weekly" | "monthly" | "quarterly" | "annual" — dopasuj do horyzontu celu (domyślnie "monthly").
- periodStart: YYYY-MM-DD, domyślnie ${today} jeśli notatka nie podaje innej daty startu.
- periodEnd: YYYY-MM-DD, termin realizacji — wywnioskuj z notatki lub użyj rozsądnego okresu względem periodType.
- isRecurring: true, jeśli cel ma charakter powtarzalny/okresowy (np. "co miesiąc", "cyklicznie"), inaczej false.
- Możesz zwrócić maks. ${GOAL_AI_BULK_MAX_GOALS} celów.

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
      "isRecurring": false
    }
  ]
}

Notatka:
"""
${notesText}
"""`;
}

export async function generateGoalsFromNotes(
  notesText: string,
  options: {
    methodologies: GoalAiBulkMethodologyContext[];
    boardKindLabel: string;
    referenceDate?: Date;
  },
): Promise<GoalAiGeneratedDraft[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Brak klucza OPENAI_API_KEY w konfiguracji serwera.");
  }

  const trimmed = notesText.trim();
  if (!trimmed) {
    throw new Error("Wklej notatkę z opisem celów.");
  }
  if (trimmed.length > GOAL_AI_BULK_MAX_INPUT_CHARS) {
    throw new Error(`Tekst jest za długi (max ${GOAL_AI_BULK_MAX_INPUT_CHARS} znaków).`);
  }

  const referenceDate = options.referenceDate ?? new Date();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const methodologyCodes = new Set(options.methodologies.map((entry) => entry.code));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Zwracasz wyłącznie JSON zgodny ze schematem. Odpowiadasz po polsku. " +
            "Nie wymyślasz faktów spoza wklejonej notatki. Tytuły celów formułujesz zgodnie z zasadami dobrze " +
            "zdefiniowanego celu (konkretny, mierzalny), a nie jako streszczenie tekstu.",
        },
        {
          role: "user",
          content: buildPrompt(trimmed, referenceDate, options.methodologies, options.boardKindLabel),
        },
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
    .map((entry) => normalizeGeneratedGoal(entry, referenceDate, methodologyCodes))
    .filter((entry): entry is GoalAiGeneratedDraft => entry !== null)
    .slice(0, GOAL_AI_BULK_MAX_GOALS);

  if (!goals.length) {
    throw new Error("AI nie znalazło żadnych celów w tej notatce.");
  }

  return goals;
}
