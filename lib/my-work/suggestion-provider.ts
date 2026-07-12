import type { WorkItemView } from "@/lib/my-work/types";
import { itemIsOverdue, itemNeedsReaction } from "@/lib/my-work/section-filters";
import type {
  WorkDaySummaryAiResponse,
  WorkRiskAnalysisResponse,
  WorkTaskAiSuggestion,
} from "@/lib/my-work/ai-types";
import type { WorkPlanView } from "@/lib/my-work/plan-types";

export function buildRuleBasedTaskSuggestions(items: WorkItemView[]): WorkTaskAiSuggestion[] {
  const suggestions: WorkTaskAiSuggestion[] = [];

  const overdue = items.filter((item) => itemIsOverdue(item));
  if (overdue.length > 0) {
    suggestions.push({
      title: `Domknij zaległe: ${overdue[0]!.title}`,
      description: `Zadanie jest po terminie. Ustal nowy plan działania lub zamknij z uzasadnieniem.`,
      expectedResult: "Status zadania zaktualizowany lub nowy termin uzgodniony.",
      priority: "urgent",
      reason: `Zaległe zadanie (${overdue.length} w kolejce).`,
    });
  }

  const blocked = items.filter((item) => item.status === "blocked");
  if (blocked.length > 0) {
    suggestions.push({
      title: `Odblokuj: ${blocked[0]!.title}`,
      description: blocked[0]!.blockedReason || "Zadanie jest zablokowane — ustal brakujące elementy.",
      expectedResult: "Przeszkoda usunięta lub eskalacja do managera.",
      priority: "high",
      reason: "Zadanie w statusie zablokowanym.",
    });
  }

  const needsReaction = items.filter((item) => itemNeedsReaction(item));
  if (needsReaction.length > 0) {
    suggestions.push({
      title: `Reakcja wymagana: ${needsReaction[0]!.title}`,
      description: "Pracownik czeka na Twoją odpowiedź lub potwierdzenie planu.",
      expectedResult: "Zadanie przyjęte lub wyjaśnione przez managera.",
      priority: "high",
      reason: "Zadanie wymaga reakcji managera.",
    });
  }

  const verification = items.filter((item) => item.status === "pending_verification");
  if (verification.length > 0) {
    suggestions.push({
      title: `Zweryfikuj wykonanie: ${verification[0]!.title}`,
      description: "Zadanie czeka na akceptację managera po zgłoszeniu wykonania.",
      expectedResult: "Status verified lub zwrot do poprawy.",
      priority: "normal",
      reason: "Kolejka weryfikacji managera.",
    });
  }

  return suggestions.slice(0, 5);
}

export function buildRuleBasedDaySummary(items: WorkItemView[]): WorkDaySummaryAiResponse {
  const open = items.filter(
    (item) => !["verified", "cancelled", "not_done"].includes(item.status),
  );
  const doneToday = items.filter((item) =>
    ["verified", "done", "pending_verification"].includes(item.status),
  );
  const blocked = open.filter((item) => item.status === "blocked" || item.status === "risk_reported");

  const highlights = doneToday.slice(0, 3).map((item) => item.title);
  const openItems = open.slice(0, 5).map((item) => `${item.title} (${item.status})`);

  const parts = [
    doneToday.length > 0
      ? `Dzisiaj zamknąłem lub wysłałem do weryfikacji ${doneToday.length} zadań.`
      : "Dzisiaj skupiłem się na bieżących zadaniach bez formalnego zamknięcia.",
    open.length > 0
      ? `Pozostało ${open.length} otwartych zadań na kolejne dni.`
      : "Nie mam otwartych zadań operacyjnych.",
    blocked.length > 0
      ? `Uwaga: ${blocked.length} zadań jest zablokowanych lub z zgłoszonym ryzykiem.`
      : "",
  ].filter(Boolean);

  return {
    draft: parts.join(" "),
    highlights,
    openItems,
    source: "rules",
  };
}

export function buildRuleBasedRiskAnalysis(
  items: WorkItemView[],
  plan: WorkPlanView | null,
): WorkRiskAnalysisResponse {
  const overdue = items.filter((item) => itemIsOverdue(item));
  const blocked = items.filter((item) => item.status === "blocked");
  const risks = [
    ...overdue.map((item) => ({
      title: item.title,
      severity: "high" as const,
      detail: "Zadanie po terminie — ryzyko opóźnienia projektu.",
    })),
    ...blocked.map((item) => ({
      title: item.title,
      severity: "medium" as const,
      detail: item.blockedReason || "Zadanie zablokowane.",
    })),
  ].slice(0, 6);

  const recommendations = [
    overdue.length > 0 ? "Przełóż lub domknij zaległe zadania na początku tygodnia." : "",
    blocked.length > 0 ? "Zaplanuj spotkanie synchronizacyjne w sprawie blokad." : "",
    plan?.status === "sent" ? "Potwierdź plan tygodnia z uwagami do ryzyk." : "",
  ].filter(Boolean);

  const riskNotes =
    risks.length > 0
      ? `Widzę ${risks.length} punktów ryzyka w planie (zaległości/blokady). ${recommendations[0] ?? ""}`
      : "Plan wygląda stabilnie — brak krytycznych zaległości w bieżącym zestawie zadań.";

  return { riskNotes, risks, recommendations, source: "rules" };
}
