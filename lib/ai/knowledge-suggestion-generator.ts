import type { KnowledgeSuggestionResult } from "@/lib/knowledge/types";

export const KNOWLEDGE_SUGGESTION_MAX_INPUT_CHARS = 6_000;

export type KnowledgeSuggestionExcerpt = {
  sourceTitle: string;
  sourceType: string;
  content: string;
};

function buildPrompt(input: {
  description: string;
  excerpts: KnowledgeSuggestionExcerpt[];
  historyExcerpts: string[];
}) {
  const excerptsBlock =
    input.excerpts.length > 0
      ? input.excerpts
          .map(
            (item, index) =>
              `[${index + 1}] Źródło: "${item.sourceTitle}" (${item.sourceType})\n${item.content.slice(0, 1200)}`,
          )
          .join("\n\n")
      : "Brak dopasowanych wpisów w bazie wiedzy firmy.";

  const historyBlock =
    input.historyExcerpts.length > 0
      ? input.historyExcerpts
          .map((item, index) => `[H${index + 1}] ${item.slice(0, 600)}`)
          .join("\n\n")
      : "Brak podobnych wcześniejszych zgłoszeń.";

  return `Jesteś asystentem wsparcia technicznego firmy instalującej systemy Smart Home / BMS.

Klient opisał problem PRZED zgłoszeniem serwisu. Twoje zadanie: sprawdzić, czy na podstawie
DOSTARCZONYCH fragmentów (baza wiedzy firmy + historia podobnych zgłoszeń) można podać klientowi
bezpieczną sugestię, którą może wypróbować SAMODZIELNIE, zanim zgłosi serwis.

ZASADY (krytyczne):
- Korzystaj WYŁĄCZNIE z poniższych fragmentów. Nie zgaduj, nie wymyślaj faktów, modeli urządzeń,
  numerów menu czy instrukcji, których nie ma w tekście poniżej.
- Jeśli fragmenty nie zawierają wystarczających informacji, ustaw "hasSuggestion": false i napisz
  krótkie, uprzejme summary, że najlepiej zgłosić serwis — bez podawania niepewnych kroków.
- Nigdy nie sugeruj działań niebezpiecznych (np. przy instalacji elektrycznej pod napięciem) —
  w takim wypadku zawsze hasSuggestion=false i poleć kontakt z serwisem.
- Jeśli warto dopytać klienta o dodatkowy szczegół przed sugestią, możesz wypełnić
  "followUpQuestion" (jedno pytanie), ale i tak podaj najlepszą możliwą sugestię w summary/steps.

Opis problemu klienta:
"""
${input.description}
"""

Fragmenty z bazy wiedzy firmy:
${excerptsBlock}

Fragmenty z historii podobnych zgłoszeń serwisowych (mogą być nieaktualne — traktuj ostrożnie):
${historyBlock}

Odpowiedz WYŁĄCZNIE poprawnym JSON:
{
  "hasSuggestion": true,
  "summary": "krótkie podsumowanie sugerowanego rozwiązania (2-4 zdania, po polsku)",
  "steps": ["krok 1", "krok 2"],
  "confidence": "high",
  "followUpQuestion": null
}`;
}

export async function generateKnowledgeSuggestion(input: {
  description: string;
  excerpts: KnowledgeSuggestionExcerpt[];
  historyExcerpts: string[];
}): Promise<KnowledgeSuggestionResult> {
  const plain = input.description.trim();
  if (!plain) {
    throw new Error("Brak opisu problemu.");
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
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Jesteś rzetelnym asystentem wsparcia technicznego. Odpowiadasz tylko na podstawie dostarczonego kontekstu, po polsku, w formacie JSON.",
        },
        {
          role: "user",
          content: buildPrompt({
            description: plain.slice(0, KNOWLEDGE_SUGGESTION_MAX_INPUT_CHARS),
            excerpts: input.excerpts,
            historyExcerpts: input.historyExcerpts,
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
    throw new Error("OpenAI nie zwróciło sugestii.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Nie udało się odczytać odpowiedzi AI.");
  }

  const data = (parsed ?? {}) as Record<string, unknown>;
  const confidenceRaw = data.confidence;
  const confidence: KnowledgeSuggestionResult["confidence"] =
    confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low"
      ? confidenceRaw
      : "low";

  return {
    hasSuggestion: Boolean(data.hasSuggestion),
    summary: typeof data.summary === "string" ? data.summary.trim() : "",
    steps: Array.isArray(data.steps)
      ? data.steps.filter((step): step is string => typeof step === "string" && step.trim().length > 0)
      : [],
    confidence,
    sourceTitles: [...new Set(input.excerpts.map((item) => item.sourceTitle))],
    usedInternet: false,
    followUpQuestion:
      typeof data.followUpQuestion === "string" && data.followUpQuestion.trim()
        ? data.followUpQuestion.trim()
        : null,
  };
}
