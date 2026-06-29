import { KANBAN_PRIORITIES, type KanbanPriority } from "@/lib/process/kanban-types";

export const KANBAN_AI_DEFAULT_DAYS_OFFSET = 14;
export const KANBAN_AI_MAX_INPUT_CHARS = 12_000;
export const KANBAN_AI_MAX_TASKS = 20;

export type KanbanAiGeneratedTask = {
  title: string;
  description: string;
  dueDate: string;
  priority: KanbanPriority;
};

function addDays(base: Date, days: number): string {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function isIsoDate(value: string): value is string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizePriority(value: unknown): KanbanPriority {
  return typeof value === "string" && (KANBAN_PRIORITIES as readonly string[]).includes(value)
    ? (value as KanbanPriority)
    : "normal";
}

function normalizeGeneratedTask(
  entry: unknown,
  defaultDueDate: string,
): KanbanAiGeneratedTask | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const raw = entry as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return null;
  }
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const dueDate =
    typeof raw.dueDate === "string" && isIsoDate(raw.dueDate) ? raw.dueDate : defaultDueDate;

  return {
    title,
    description,
    dueDate,
    priority: normalizePriority(raw.priority),
  };
}

function buildPrompt(clientText: string, referenceDate: Date, defaultDueDate: string) {
  const today = referenceDate.toISOString().slice(0, 10);
  return `Jesteś asystentem firmy instalacji Smart Home. Na podstawie wiadomości od klienta wyodrębnij konkretne zadania do tablicy Kanban zespołu technicznego.

Dzisiejsza data: ${today}
Domyślny termin (gdy klient nie podaje daty): ${defaultDueDate}

Zasady:
- Zwróć od 1 do ${KANBAN_AI_MAX_TASKS} zadań, każde jednoznaczne i wykonalne.
- Tytuł: krótki, po polsku, max 120 znaków.
- Opis: opcjonalny kontekst z wiadomości klienta, max 500 znaków.
- dueDate: format YYYY-MM-DD. Interpretuj wyrażenia względne (np. "za 2 tygodnie", "na przyszły tydzień", "jutro").
- Gdy brak wskazówki czasowej — użyj domyślnego terminu ${defaultDueDate}.
- priority: jedna z wartości low | normal | high | urgent. Pilne/szybko/ASAP → urgent lub high.
- Nie wymyślaj rzeczy, których nie ma w tekście. Łącz powtarzające się prośby w jedno zadanie.

Odpowiedz WYŁĄCZNIE poprawnym JSON:
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "dueDate": "YYYY-MM-DD",
      "priority": "normal"
    }
  ]
}

Wiadomość klienta:
"""
${clientText}
"""`;
}

export async function generateKanbanTasksFromClientText(
  clientText: string,
  options?: { referenceDate?: Date },
): Promise<KanbanAiGeneratedTask[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Brak klucza OPENAI_API_KEY w konfiguracji serwera.");
  }

  const trimmed = clientText.trim();
  if (!trimmed) {
    throw new Error("Wklej wiadomość od klienta.");
  }
  if (trimmed.length > KANBAN_AI_MAX_INPUT_CHARS) {
    throw new Error(`Tekst jest za długi (max ${KANBAN_AI_MAX_INPUT_CHARS} znaków).`);
  }

  const referenceDate = options?.referenceDate ?? new Date();
  const defaultDueDate = addDays(referenceDate, KANBAN_AI_DEFAULT_DAYS_OFFSET);
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

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
            "Zwracasz wyłącznie JSON zgodny ze schematem. Zadania po polsku, dla zespołu technicznego Smart Home.",
        },
        {
          role: "user",
          content: buildPrompt(trimmed, referenceDate, defaultDueDate),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      errorBody
        ? `OpenAI: ${errorBody.slice(0, 240)}`
        : `OpenAI zwróciło błąd HTTP ${response.status}.`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
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

  const tasksRaw =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>).tasks
      : null;

  if (!Array.isArray(tasksRaw)) {
    throw new Error("Odpowiedź AI ma nieprawidłowy format.");
  }

  const tasks = tasksRaw
    .map((entry) => normalizeGeneratedTask(entry, defaultDueDate))
    .filter((task): task is KanbanAiGeneratedTask => task !== null)
    .slice(0, KANBAN_AI_MAX_TASKS);

  if (!tasks.length) {
    throw new Error("AI nie znalazło żadnych zadań w tym tekście.");
  }

  return tasks;
}
