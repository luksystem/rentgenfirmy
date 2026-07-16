import type {
  ProjectHealthBand,
  ProjectHealthSentiment,
  ProjectHealthSignals,
  ProjectHealthThreadItem,
} from "@/lib/projects/project-health";

export const PROJECT_HEALTH_SUMMARY_MAX_CHARS = 28_000;

export type ProjectHealthSummaryInput = {
  projectName: string;
  stageTitle: string | null;
  processProgressPercent: number | null;
  score: number;
  band: ProjectHealthBand;
  sentiment: ProjectHealthSentiment;
  signals: ProjectHealthSignals;
  goals: Array<{
    name: string;
    status: string;
    progressPercent: number;
    periodEnd: string;
    needsRevisit: boolean;
    deferralCount: number;
  }>;
  thread: ProjectHealthThreadItem[];
};

function buildPrompt(input: ProjectHealthSummaryInput) {
  const goalsBlock =
    input.goals.length === 0
      ? "(brak celów powiązanych z projektem)"
      : input.goals
          .map(
            (g, i) =>
              `${i + 1}. ${g.name} · status=${g.status} · ${g.progressPercent}% · termin=${g.periodEnd}` +
              (g.needsRevisit ? " · TRZEBA WRÓCIĆ" : "") +
              (g.deferralCount > 0 ? ` · przekładany ${g.deferralCount}×` : ""),
          )
          .join("\n");

  const threadBlock =
    input.thread.length === 0
      ? "(brak wpisów w wątku)"
      : input.thread
          .slice(0, 40)
          .map(
            (item) =>
              `- [${item.at.slice(0, 10)}] ${item.kind} · ${item.goalName}: ${item.title} — ${item.body.slice(0, 280)}`,
          )
          .join("\n");

  const s = input.signals;

  return `Jesteś analitykiem zdrowia projektu w firmie wdrożeniowej.

Na podstawie celów, zadań, przełożeń, komentarzy i etapu procesu oceń kondycję projektu po polsku.

Zasady:
- Opieraj się wyłącznie na dostarczonych danych — nie wymyślaj faktów.
- Uwzględnij zgodność z aktualnym etapem procesu (czy cele/zadania „doganiają” etap, czy lagują).
- Oceń nastrój wątku (pozytywny / mieszany / negatywny) na podstawie komentarzy i wniosków.
- Struktura odpowiedzi (markdown):
  1. **Werdykt** — 1–2 zdania + sugerowana etykieta: Stabilny / Wymaga uwagi / Zagrożony
  2. **Nastrój i komunikacja** — czy ton jest pozytywny, mieszany czy negatywny; przykłady
  3. **Cele vs etap** — co jest na torze, co odstaje od etapu „${input.stageTitle ?? "nieznany"}”
  4. **Ryzyka i niedowiezienia**
  5. **Co zrobić dalej** — 3–5 konkretnych działań

Kontekst:
- Projekt: ${input.projectName}
- Etap procesu: ${input.stageTitle ?? "brak"}
- Postęp procesu: ${input.processProgressPercent != null ? `${input.processProgressPercent}%` : "brak"}
- Wynik heurystyczny: ${input.score}/100 (${input.band}), nastrój heurystyczny: ${input.sentiment}

Sygnały:
- Cele: ${s.goalsTotal} (aktywne ${s.goalsActive}, zagrożone ${s.goalsAtRisk}, wstrzymane ${s.goalsOnHold}, rozliczone ${s.goalsSettled})
- Po terminie: ${s.overdueCount}, trzeba wrócić: ${s.revisitCount}
- Przełożenia: ${s.deferralCount}, niedowiezione (nasz powód): ${s.undeliveredCount}
- Zadania: ${s.tasksDone}/${s.tasksTotal} zrobione (otwarte ${s.openTasks})
- Śr. postęp aktywnych: ${s.avgProgress}%

Cele:
${goalsBlock}

Wątek (najnowsze wpisy):
${threadBlock}`;
}

export async function generateProjectHealthSummary(
  input: ProjectHealthSummaryInput,
): Promise<string> {
  const prompt = buildPrompt(input);
  if (prompt.length > PROJECT_HEALTH_SUMMARY_MAX_CHARS) {
    throw new Error("Dane projektu są zbyt długie do analizy zdrowia.");
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
            "Analizujesz zdrowie projektów. Odpowiadasz po polsku w markdown, konkretnie i operacyjnie, bez bloków kodu.",
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
    throw new Error("AI nie zwróciło podsumowania zdrowia projektu.");
  }
  return content.replace(/^```(?:markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
