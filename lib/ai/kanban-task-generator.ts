import { KANBAN_PRIORITIES, type KanbanPriority } from "@/lib/process/kanban-types";

export const KANBAN_AI_DEFAULT_DAYS_OFFSET = 14;
export const KANBAN_AI_MAX_INPUT_CHARS = 12_000;
export const KANBAN_AI_MAX_TASKS = 40;

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
  return `Jesteś asystentem firmy instalacji Smart Home. Na podstawie wiadomości od klienta utwórz wpisy do tablicy Kanban zespołu technicznego.

Dzisiejsza data: ${today}
Domyślny termin (gdy klient nie podaje daty): ${defaultDueDate}

Zasady bezwzględne:
- OBEJMIJ CAŁY wklejony tekst — nic nie pomijaj. Każdy fragment wiadomości musi trafić do co najmniej jednego wpisu (zadanie, pytanie do wyjaśnienia, ustalenie do potwierdzenia, informacja do odnotowania).
- Nawet jeśli coś NIE brzmi jak prośba o pracę (np. pytanie, wątpliwość, komentarz, „czy można…?”, „proszę o info”), i tak utwórz osobny wpis — np. tytuł „Pytanie klienta: …” lub „Do ustalenia z klientem: …”.
- Opieraj się WYŁĄCZNIE na wklejonym tekście. NIE dopisuj, NIE zgaduj, NIE uzupełniaj braków wiedzą ogólną ani typowymi praktykami. Jeśli czegoś nie ma w tekście — nie dodawaj tego.
- W polu description przepisz jak najwięcej szczegółów ze źródła: cytaty, numery, nazwy urządzeń/pomieszczeń, daty wspomniane przez klienta, kontekst zdania. Im pełniejszy opis, tym lepiej (do ok. 2000 znaków na wpis).
- Tytuł: krótki, po polsku, max 120 znaków — streszczenie sensu fragmentu, nie ogólnik.
- dueDate: format YYYY-MM-DD. Interpretuj wyrażenia względne (np. „za 2 tygodnie”, „na przyszły tydzień”, „jutro”) względem daty ${today}.
- Gdy klient nie podaje terminu dla danego fragmentu — użyj ${defaultDueDate}.
- priority: jedna z wartości low | normal | high | urgent. Pilne/szybko/ASAP → urgent lub high.
- Nie łącz w jedno zadanie różnych tematów tylko po to, by zmniejszyć liczbę wpisów. Osobny fragment = osobny wpis (chyba że to dosłownie ta sama prośba powtórzona).
- Możesz zwrócić do ${KANBAN_AI_MAX_TASKS} wpisów, jeśli tekst tego wymaga.

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
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Zwracasz wyłącznie JSON zgodny ze schematem. Wpisy po polsku dla zespołu Smart Home. " +
            "Nie pomijasz żadnego fragmentu wiadomości klienta. Nie wymyślasz faktów spoza tekstu. " +
            "Opisy mają być maksymalnie szczegółowe i oparte na cytowanym materiale źródłowym.",
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
