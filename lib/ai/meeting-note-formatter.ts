export const MEETING_NOTE_AI_MAX_INPUT_CHARS = 16_000;

function buildPrompt(rawNotes: string) {
  return `Jesteś asystentem firmy Smart Home / BMS. Sformatuj surowe notatki ze spotkania z klientem lub wykonawcą.

Zasady:
- Odpowiedz po polsku w formacie Markdown.
- Użyj sekcji: ## Uczestnicy, ## Omówione tematy, ## Ustalenia, ## Dalsze kroki (pomiń puste sekcje).
- Nie wymyślaj faktów — opieraj się wyłącznie na wklejonym tekście.
- Popraw interpunkcję i podziel na logiczne akapity / listy punktowane.
- Zachowaj nazwy urządzeń, protokoły, daty i kwoty ze źródła.

Surowe notatki:
"""
${rawNotes}
"""`;
}

export async function formatMeetingNoteWithAi(rawNotes: string): Promise<string> {
  const trimmed = rawNotes.trim();
  if (!trimmed) {
    throw new Error("Wklej treść notatek do sformatowania.");
  }
  if (trimmed.length > MEETING_NOTE_AI_MAX_INPUT_CHARS) {
    throw new Error(`Notatki są zbyt długie (max ${MEETING_NOTE_AI_MAX_INPUT_CHARS} znaków).`);
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
      messages: [
        {
          role: "system",
          content: "Formatuj notatki ze spotkań technicznych. Zwracaj wyłącznie sformatowany Markdown.",
        },
        { role: "user", content: buildPrompt(trimmed) },
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
    throw new Error("OpenAI nie zwróciło sformatowanej treści.");
  }

  return content;
}
