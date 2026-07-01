export const MEETING_NOTE_AI_MAX_INPUT_CHARS = 16_000;

function stripHtmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function buildPrompt(rawNotes: string) {
  return `Jesteś asystentem firmy Smart Home / BMS. Sformatuj surowe notatki ze spotkania z klientem lub wykonawcą.

Zasady formatowania (HTML):
- Odpowiedz po polsku wyłącznie w HTML — dozwolone tagi: h3, h4, p, strong, b, em, i, ul, ol, li, br.
- NIE używaj markdown ani bloków \`\`\`.
- Każda sekcja zaczyna się od <h3> z nazwą sekcji.
- Możliwe sekcje (pomiń puste): Uczestnicy, Omówione tematy, Ustalenia, Dalsze kroki, Uwagi.
- Pod nagłówkiem daj odstęp — treść w akapitach <p> lub listach <ul>/<ol><li>.
- Ważne terminy, daty, urządzenia, kwoty i decyzje oznacz <strong>.
- Między sekcjami zostaw wyraźny podział (nagłówek h3, potem treść).
- Nie wymyślaj faktów — opieraj się wyłącznie na wklejonym tekście.
- Popraw interpunkcję i literówki oczywiste ze źródła.

Przykład struktury:
<h3>Uczestnicy</h3>
<p>...</p>
<h3>Ustalenia</h3>
<ul><li><strong>...</strong> — ...</li></ul>

Surowe notatki:
"""
${rawNotes}
"""`;
}

export function normalizeMeetingNoteHtml(content: string) {
  let html = content.trim();
  html = html.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!html.includes("<") && html.includes("\n")) {
    html = html
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }
  return html;
}

export async function formatMeetingNoteWithAi(rawNotes: string): Promise<string> {
  const plain = stripHtmlToPlainText(rawNotes);
  if (!plain) {
    throw new Error("Wklej treść notatek do sformatowania.");
  }
  if (plain.length > MEETING_NOTE_AI_MAX_INPUT_CHARS) {
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
          content:
            "Formatuj notatki ze spotkań technicznych. Zwracaj wyłącznie fragment HTML z nagłówkami h3, akapitami p i listami ul/li. Bez markdown, bez ```.",
        },
        { role: "user", content: buildPrompt(plain) },
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

  return normalizeMeetingNoteHtml(content);
}
