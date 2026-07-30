import { describe, expect, it } from "vitest";
import {
  daysSinceOurContact,
  resolveSilenceState,
  type ProjectActivityAxes,
} from "@/lib/communication/types";

const NOW = new Date("2026-07-30T12:00:00Z");
const SILENCE_DAYS = 30;

function axes(internal: string | null, client: string | null): ProjectActivityAxes {
  return { lastInternalActivityAt: internal, lastClientActivityAt: client };
}

/**
 * Tablica prawdy czterech kombinacji z docs/08 D18 — wszystkie wejścia, nie tylko przypadek
 * szczęśliwy (standard testowy (b) z CLAUDE.md).
 */
describe("resolveSilenceState — cztery kombinacje D18", () => {
  it("obie osie świeże → zdrowo", () => {
    expect(resolveSilenceState(axes("2026-07-28T00:00:00Z", "2026-07-29T00:00:00Z"), SILENCE_DAYS, NOW))
      .toBe("zdrowo");
  });

  it("my świeżo, klient stary → klient milczy", () => {
    expect(resolveSilenceState(axes("2026-07-28T00:00:00Z", "2026-05-01T00:00:00Z"), SILENCE_DAYS, NOW))
      .toBe("klient_milczy");
  });

  it("klient świeżo, my starzy → my nie reagujemy (najgorszy wizerunkowo)", () => {
    expect(resolveSilenceState(axes("2026-05-01T00:00:00Z", "2026-07-29T00:00:00Z"), SILENCE_DAYS, NOW))
      .toBe("my_nie_reagujemy");
  });

  it("obie osie stare → obie ciche", () => {
    expect(resolveSilenceState(axes("2026-05-01T00:00:00Z", "2026-05-02T00:00:00Z"), SILENCE_DAYS, NOW))
      .toBe("obie_ciche");
  });
});

describe("resolveSilenceState — brak danych i granice", () => {
  it("brak obu dat → obie ciche, nie zdrowo (projekt bez śladu kontaktu jest cichy)", () => {
    expect(resolveSilenceState(axes(null, null), SILENCE_DAYS, NOW)).toBe("obie_ciche");
  });

  it("brak naszej daty przy świeżej klienckiej → my nie reagujemy", () => {
    expect(resolveSilenceState(axes(null, "2026-07-29T00:00:00Z"), SILENCE_DAYS, NOW))
      .toBe("my_nie_reagujemy");
  });

  it("brak daty klienckiej przy świeżej naszej → klient milczy", () => {
    expect(resolveSilenceState(axes("2026-07-29T00:00:00Z", null), SILENCE_DAYS, NOW))
      .toBe("klient_milczy");
  });

  it("dokładnie na progu (30 dni) jest jeszcze zdrowe — stare dopiero POWYŻEJ progu", () => {
    expect(resolveSilenceState(axes("2026-06-30T12:00:00Z", "2026-06-30T12:00:00Z"), SILENCE_DAYS, NOW))
      .toBe("zdrowo");
  });

  it("dzień po progu (31 dni) jest już ciche", () => {
    expect(resolveSilenceState(axes("2026-06-29T12:00:00Z", "2026-06-29T12:00:00Z"), SILENCE_DAYS, NOW))
      .toBe("obie_ciche");
  });

  it("data w przyszłości nie wywraca wyliczenia (ujemny wiek = świeże)", () => {
    expect(resolveSilenceState(axes("2026-08-05T00:00:00Z", "2026-08-05T00:00:00Z"), SILENCE_DAYS, NOW))
      .toBe("zdrowo");
  });

  it("niepoprawna data traktowana jak brak", () => {
    expect(resolveSilenceState(axes("nie-data", "2026-07-29T00:00:00Z"), SILENCE_DAYS, NOW))
      .toBe("my_nie_reagujemy");
  });

  it("próg ostrzegawczy (25) zapala się wcześniej niż bezpiecznik (30)", () => {
    const stale = axes("2026-07-02T12:00:00Z", "2026-07-29T00:00:00Z"); // 28 dni
    expect(resolveSilenceState(stale, 25, NOW)).toBe("my_nie_reagujemy");
    expect(resolveSilenceState(stale, 30, NOW)).toBe("zdrowo");
  });
});

describe("daysSinceOurContact", () => {
  it("liczy dni od naszego ostatniego odezwania się", () => {
    expect(daysSinceOurContact(axes("2026-07-20T12:00:00Z", null), NOW)).toBe(10);
  });

  it("null gdy nigdy się nie odezwaliśmy", () => {
    expect(daysSinceOurContact(axes(null, "2026-07-29T00:00:00Z"), NOW)).toBeNull();
  });
});
