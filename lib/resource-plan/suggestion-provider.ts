// Etap 8 modułu Plan Zasobów — punkt rozszerzenia pod przyszły Recommendation Engine / Capacity
// Planner oparty o AI, wzorem `lib/audit/*` (silnik regułowy jako ground truth + osobna warstwa
// AI) i `lib/ai/goal-ai-advisor.ts` (moduł Celów).
//
// UI (panel boczny) NIE woła `suggestResourcePlanCandidates` bezpośrednio — woła
// `getActiveSuggestionProvider().getCandidates(...)`. Dzięki temu podłączenie przyszłego dostawcy
// AI (np. wywołania modelu z kontekstem projektu/etapu/zespołu) nie wymaga żadnych zmian w
// komponentach — wystarczy dodać nowego dostawcę poniżej i (opcjonalnie za feature flagiem)
// zmienić, który jest aktywny. Interfejs jest asynchroniczny od początku (nawet gdy silnik
// regułowy jest w praktyce synchroniczny), bo dostawca AI z natury wykonuje wywołanie sieciowe.

import {
  suggestResourcePlanCandidates,
  type ResourcePlanCandidate,
} from "@/lib/resource-plan/suggestions";

export type ResourcePlanSuggestionParams = Parameters<typeof suggestResourcePlanCandidates>[0];

export type ResourcePlanSuggestionProvider = {
  id: string;
  label: string;
  /** Krótki opis pochodzenia sugestii — wyświetlany w UI, żeby koordynator wiedział, czy to reguły czy AI. */
  description: string;
  getCandidates: (params: ResourcePlanSuggestionParams) => Promise<ResourcePlanCandidate[]>;
};

export const ruleBasedSuggestionProvider: ResourcePlanSuggestionProvider = {
  id: "rule_based",
  label: "Sugestie regułowe",
  description: "Dopasowanie po rolach/kompetencjach, dostępności, obciążeniu i konfliktach terminów (bez AI).",
  getCandidates: (params) => Promise.resolve(suggestResourcePlanCandidates(params)),
};

// Rejestr dostawców — dziś tylko silnik regułowy. Przyszły dostawca AI dodaje się tutaj jako
// kolejny wpis, np.:
//   export const aiSuggestionProvider: ResourcePlanSuggestionProvider = {
//     id: "ai_advisor",
//     label: "Sugestie AI",
//     description: "…",
//     getCandidates: async (params) => { /* wywołanie modelu, z fallbackiem do ruleBasedSuggestionProvider przy błędzie */ },
//   };
const registeredProviders: ResourcePlanSuggestionProvider[] = [ruleBasedSuggestionProvider];

export function getAvailableSuggestionProviders(): ResourcePlanSuggestionProvider[] {
  return registeredProviders;
}

/**
 * Aktywny dostawca sugestii. Na razie zawsze regułowy — kiedy pojawi się dostawca AI, przełącznik
 * (np. ustawienie modułu / feature flag) będzie zmieniał tylko to miejsce.
 */
export function getActiveSuggestionProvider(): ResourcePlanSuggestionProvider {
  return ruleBasedSuggestionProvider;
}
