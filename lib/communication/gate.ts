// Faza 11a (docs/08 D19 §6) — bramy faz komunikacji.
//
// Świadomie TYLKO bramy: który reżim komunikacyjny obowiązuje projekt "dziś". Modyfikatory
// (+1 poziom, wygasające same), egzekwowanie bezpiecznika ciszy i "przejęcie czerwone" to faza
// 11b ("silnik") — osobna, większa pozycja w sekwencji. Ta funkcja nie stackuje modyfikatorów ani
// nie sprawdza, czy bezpiecznik minął — zwraca tylko, KTÓRY z pięciu wierszy tabeli D19 §6
// obowiązuje i jakie parametry (dni bezpiecznika, czy modyfikatory w ogóle mają zastosowanie)
// przypisano temu wierszowi w specyfikacji.
import type { CommunicationPhase } from "@/lib/process/types";

/**
 * `brak_komunikacji` i `tryb_serwisowy` NIE są fazami komunikacji (D19: "tryb serwisowy nie jest
 * szóstą fazą") — to osobne reżimy. `nieustalona` to stan danych, nie stan projektu: "w trakcie"
 * bez rozwiązywalnego etapu aktywnego (dziś 0 takich na produkcji, ale możliwe po błędzie
 * synchronizacji szablonu) — nigdy nie zgadujemy domyślnej fazy w jego miejsce.
 */
export const COMMUNICATION_REGIMES = [
  "brak_komunikacji",
  "tryb_serwisowy",
  "nieustalona",
  "CZUWANIE",
  "STANDARD",
  "INTENSYWNA",
  "KRYTYCZNA",
] as const;
export type CommunicationRegime = (typeof COMMUNICATION_REGIMES)[number];

export type CommunicationGateInput = {
  /** Wartość z `projects.flow_status` — dana, nie enum w kodzie (dziś: Wygaszony/W trakcie/Zamknięty). */
  flowStatus: string;
  /** Czy `project_coverage_periods` ma dziś aktywny okres (gwarancja pierwotna, przedłużenie, umowa). */
  coverageActiveToday: boolean;
  /** Czy `project_active_holds` ma dziś wiersz dla tego projektu. */
  hasActiveHold: boolean;
  /** `base_communication_phase` etapu wskazanego przez `active_stage_id`. Null = brak etapu
   *  aktywnego albo etap nie rozwiązuje się w bieżącym szablonie (miękkie odniesienie). */
  activeStageBasePhase: CommunicationPhase | null;
};

export type CommunicationGateResult = {
  /** Który wiersz D19 §6 zadecydował — do debugowania i do testu tablicy prawdy. */
  gateNumber: 1 | 2 | 3 | 4 | 5;
  regime: CommunicationRegime;
  /** Dni bezpiecznika ciszy przypisane temu stanowi. Null = bezpiecznik nie dotyczy (gate 1-3). */
  silenceBreakerDays: 30 | 90 | null;
  /** Czy modyfikatory z fazy 11b mają w ogóle zastosowanie w tym stanie. */
  modifiersEnabled: boolean;
};

const FLOW_STATUS_WYGASZONY = "Wygaszony";
const FLOW_STATUS_ZAMKNIETY = "Zamknięty";

export function resolveCommunicationGate(input: CommunicationGateInput): CommunicationGateResult {
  // Gate 1 — D19 §6 wiersz 1: wygaszony -> brak komunikacji.
  if (input.flowStatus === FLOW_STATUS_WYGASZONY) {
    return { gateNumber: 1, regime: "brak_komunikacji", silenceBreakerDays: null, modifiersEnabled: false };
  }

  // Gate 2/3 — wiersze 2-3: zamknięty rozstrzyga się WYŁĄCZNIE po pokryciu, nie po samym statusie.
  // flow_status='Zamknięty' w praktyce implikuje pokrycie aktywne w momencie ostatniego przeliczenia
  // (migracja 228), ale to przeliczenie jest cronowe (raz na dobę) — sprawdzamy pokrycie tutaj
  // niezależnie, żeby brama nie ufała stanowi, który mógł się zdezaktualizować w ciągu dnia.
  if (input.flowStatus === FLOW_STATUS_ZAMKNIETY) {
    if (input.coverageActiveToday) {
      return { gateNumber: 3, regime: "tryb_serwisowy", silenceBreakerDays: null, modifiersEnabled: false };
    }
    return { gateNumber: 2, regime: "brak_komunikacji", silenceBreakerDays: null, modifiersEnabled: false };
  }

  // Pozostałe wartości flow_status traktujemy jak "w trakcie" (dziś jedyna trzecia wartość) —
  // gate 4/5, wiersze 4-5.
  if (input.hasActiveHold) {
    return { gateNumber: 4, regime: "CZUWANIE", silenceBreakerDays: 90, modifiersEnabled: false };
  }

  if (input.activeStageBasePhase === null) {
    return { gateNumber: 5, regime: "nieustalona", silenceBreakerDays: 30, modifiersEnabled: true };
  }

  return {
    gateNumber: 5,
    regime: input.activeStageBasePhase,
    silenceBreakerDays: 30,
    modifiersEnabled: true,
  };
}
