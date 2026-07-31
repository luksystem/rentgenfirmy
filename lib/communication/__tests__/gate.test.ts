import { describe, expect, it } from "vitest";
import { resolveCommunicationGate, type CommunicationGateInput } from "@/lib/communication/gate";

function input(patch: Partial<CommunicationGateInput> = {}): CommunicationGateInput {
  return {
    flowStatus: "W trakcie",
    coverageActiveToday: false,
    hasActiveHold: false,
    activeStageBasePhase: "STANDARD",
    // Te same wartości co domyślne w PolicyThresholds (30/90) — testy pilnują kolejności
    // priorytetów w bramie, nie konkretnych liczb progów, więc dowolna wartość by wystarczyła;
    // biorę realne domyślne, żeby test czytał się jak żywy scenariusz.
    silenceThresholds: { inProgressDays: 30, holdDays: 90 },
    ...patch,
  };
}

describe("resolveCommunicationGate — D19 §6, pięć wierszy tabeli", () => {
  it("gate 1 — wygaszony, niezależnie od reszty pól", () => {
    expect(
      resolveCommunicationGate(
        input({ flowStatus: "Wygaszony", hasActiveHold: true, coverageActiveToday: true }),
      ),
    ).toEqual({ gateNumber: 1, regime: "brak_komunikacji", silenceBreakerDays: null, modifiersEnabled: false });
  });

  it("gate 2 — zamknięty, pokrycie już nieaktywne", () => {
    expect(
      resolveCommunicationGate(input({ flowStatus: "Zamknięty", coverageActiveToday: false })),
    ).toEqual({ gateNumber: 2, regime: "brak_komunikacji", silenceBreakerDays: null, modifiersEnabled: false });
  });

  it("gate 3 — zamknięty, pokrycie aktywne dziś: tryb serwisowy, bez bezpiecznika", () => {
    expect(
      resolveCommunicationGate(input({ flowStatus: "Zamknięty", coverageActiveToday: true })),
    ).toEqual({ gateNumber: 3, regime: "tryb_serwisowy", silenceBreakerDays: null, modifiersEnabled: false });
  });

  it("gate 4 — w trakcie + wstrzymanie: CZUWANIE stałe, bezpiecznik 90 dni, modyfikatory wyłączone", () => {
    expect(
      resolveCommunicationGate(
        input({ flowStatus: "W trakcie", hasActiveHold: true, activeStageBasePhase: "KRYTYCZNA" }),
      ),
    ).toEqual({ gateNumber: 4, regime: "CZUWANIE", silenceBreakerDays: 90, modifiersEnabled: false });
  });

  it("gate 5 — w trakcie, faza bierze się WPROST z etapu (tu: INTENSYWNA), bezpiecznik 30 dni", () => {
    expect(
      resolveCommunicationGate(input({ flowStatus: "W trakcie", activeStageBasePhase: "INTENSYWNA" })),
    ).toEqual({ gateNumber: 5, regime: "INTENSYWNA", silenceBreakerDays: 30, modifiersEnabled: true });
  });

  it("gate 5 — wszystkie cztery fazy bazowe przechodzą przez bramę bez zmian", () => {
    for (const phase of ["CZUWANIE", "STANDARD", "INTENSYWNA", "KRYTYCZNA"] as const) {
      expect(resolveCommunicationGate(input({ activeStageBasePhase: phase })).regime).toBe(phase);
    }
  });

  it("gate 5 — brak rozwiązywalnego etapu aktywnego: 'nieustalona', NIE domyślne STANDARD", () => {
    // Zero takich projektów na produkcji dziś, ale to stan danych (błąd synchronizacji szablonu),
    // nie stan projektu — zgadywanie fazy w jego miejsce ukryłoby prawdziwy problem.
    expect(resolveCommunicationGate(input({ activeStageBasePhase: null }))).toEqual({
      gateNumber: 5,
      regime: "nieustalona",
      silenceBreakerDays: 30,
      modifiersEnabled: true,
    });
  });

  it("pierwsza pasująca wygrywa: wygaszony bije zarówno wstrzymanie jak i pokrycie", () => {
    // Test na literalne brzmienie D19 §6: "pierwsza pasująca wygrywa" — kolejność warunków w
    // funkcji musi odzwierciedlać kolejność wierszy w tabeli, nie odwrotnie.
    const result = resolveCommunicationGate(
      input({ flowStatus: "Wygaszony", coverageActiveToday: true, hasActiveHold: true }),
    );
    expect(result.gateNumber).toBe(1);
  });

  it("zamknięty bije wstrzymanie — hold jest odczytywany tylko w gałęzi 'w trakcie'", () => {
    const result = resolveCommunicationGate(
      input({ flowStatus: "Zamknięty", coverageActiveToday: true, hasActiveHold: true }),
    );
    expect(result.gateNumber).toBe(3);
  });

  it("nieznana wartość flow_status traktowana jak 'w trakcie' (dziś jedyna trzecia wartość w bazie)", () => {
    const result = resolveCommunicationGate(input({ flowStatus: "coś nowego" }));
    expect(result.gateNumber).toBe(5);
  });

  it("dni bezpiecznika PRZYCHODZĄ z ustawień, nie są wpisane na sztywno w funkcji", () => {
    // Strażnik regresji: pierwsza wersja miała 30/90 zaszyte w kodzie zamiast czytać
    // PolicyThresholds — inne liczby na wejściu muszą wyjść na wyjściu.
    const gate4 = resolveCommunicationGate(
      input({ hasActiveHold: true, silenceThresholds: { inProgressDays: 7, holdDays: 365 } }),
    );
    expect(gate4.silenceBreakerDays).toBe(365);

    const gate5 = resolveCommunicationGate(
      input({ silenceThresholds: { inProgressDays: 7, holdDays: 365 } }),
    );
    expect(gate5.silenceBreakerDays).toBe(7);
  });
});
