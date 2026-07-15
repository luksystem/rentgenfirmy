export const GOAL_REVIEW_MEETING_SUMMARY_MAX_CHARS = 24_000;

export type GoalReviewMeetingSummaryInput = {
  boardName: string;
  plannedMinutes: number;
  participantNames: string[];
  items: Array<{
    goalName: string;
    ownerName: string;
    deepDive: boolean;
    outcome: string | null;
    notes: string;
    statusLabel?: string;
  }>;
  actions: Array<{
    goalName: string;
    title: string;
    hasKanbanTask: boolean;
  }>;
};

function buildPrompt(input: GoalReviewMeetingSummaryInput) {
  const itemsBlock = input.items
    .map((item, index) => {
      return `${index + 1}. Cel: ${item.goalName}
   Właściciel: ${item.ownerName}
   Deep-dive: ${item.deepDive ? "tak" : "nie"}
   Wynik przeglądu: ${item.outcome ?? "brak"}
   Status celu: ${item.statusLabel ?? "—"}
   Notatki:
"""
${item.notes.trim() || "(brak notatek)"}
"""`;
    })
    .join("\n\n");

  const actionsBlock =
    input.actions.length === 0
      ? "(brak nowych zadań)"
      : input.actions
          .map(
            (action) =>
              `- ${action.title} (cel: ${action.goalName}${action.hasKanbanTask ? ", także Kanban" : ""})`,
          )
          .join("\n");

  return `Jesteś asystentem facylitatora przeglądu celów w firmie.

Na podstawie notatek i wyników przeglądu przygotuj zwięzłe podsumowanie spotkania po polsku.

Zasady:
- Opieraj się wyłącznie na dostarczonych danych — nie wymyślaj faktów.
- Struktura odpowiedzi (markdown):
  1. **Przebieg** — 2–4 zdania
  2. **Ocena celów** — lista: cel → wynik + krótkie uzasadnienie względem kryteriów
  3. **Ryzyka i blokery**
  4. **Ustalenia / zadania**
  5. **Wnioski na następny przegląd**
- Bądź konkretny i operacyjny.

Kontekst spotkania:
- Tablica: ${input.boardName}
- Planowany czas: ${input.plannedMinutes} min
- Uczestnicy: ${input.participantNames.join(", ") || "nieznani"}

Omówione cele:
${itemsBlock}

Zadania utworzone na spotkaniu:
${actionsBlock}`;
}

export async function generateGoalReviewMeetingSummary(
  input: GoalReviewMeetingSummaryInput,
): Promise<string> {
  const prompt = buildPrompt(input);
  if (prompt.length > GOAL_REVIEW_MEETING_SUMMARY_MAX_CHARS) {
    throw new Error("Dane spotkania są zbyt długie do podsumowania SI.");
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
      messages: [
        {
          role: "system",
          content:
            "Tworzysz podsumowania przeglądów celów. Odpowiadasz po polsku w markdown, bez bloków kodu.",
        },
        { role: "user", content: prompt },
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
    throw new Error("AI nie zwróciło podsumowania.");
  }
  return content.replace(/^```(?:markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
