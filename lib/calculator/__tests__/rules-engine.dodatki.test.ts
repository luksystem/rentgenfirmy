import { describe, expect, it } from "vitest";
import { calculateAddons } from "@/lib/calculator/engine";
import { buildScope, evaluateRules } from "@/lib/calculator/rules-engine";
import { DEFAULT_CALCULATOR_RULES } from "@/lib/calculator/rules-types";
import { DEFAULT_CALCULATOR_SETTINGS } from "@/lib/calculator/settings";
import { CALCULATOR_ADDON_KEYS, emptyCalculatorAnswers, type CalculatorAnswers } from "@/lib/calculator/types";

/**
 * Weryfikacja RÓWNOWAŻNOŚCI kategorii "Dodatki" — silnik regułowy porównany bezpośrednio z
 * zaufanym calculateAddons z engine.ts. Patrz rules-engine.baza.test.ts po uzasadnienie metody.
 */

function dodatkiTotalFromRules(answers: CalculatorAnswers): number {
  const scope = buildScope(answers, DEFAULT_CALCULATOR_SETTINGS);
  const result = evaluateRules(DEFAULT_CALCULATOR_RULES, scope);
  return result.totalsByCategory.dodatki ?? 0;
}

function legacyAddonsNet(answers: CalculatorAnswers): number {
  const sum = calculateAddons(answers, DEFAULT_CALCULATOR_SETTINGS).reduce((s, item) => s + item.net, 0);
  return Math.round(sum * 100) / 100;
}

describe("rules-engine — kategoria 'dodatki' identyczna z calculateAddons (realne przykłady)", () => {
  it("wszystkie 22 dodatki zaznaczone naraz, trudny klient=1.2", () => {
    const answers = emptyCalculatorAnswers();
    for (const key of CALCULATOR_ADDON_KEYS) {
      answers.addons[key] = true;
    }
    answers.trudnyKlientWspolczynnik = 1.2;
    answers.liczbaOkienOtwieranych = 12;
    answers.czyOknaCzujnikiFabryczne = false;
    answers.iloscKlawiaturNfc = 3;
    answers.iloscElektrozaczepow = 2;
    answers.iloscOswSciemniane = 9; // celowo nie wielokrotność 4
    answers.platneIntegracjeZInnymiSystemami = true;
    answers.integracjaKlimatyzacja = true;
    answers.integracjaWentylacja = true;
    answers.integracjaRekuperacja = false;
    answers.integracjaPompaCiepla = true;

    const legacy = legacyAddonsNet(answers);
    expect(dodatkiTotalFromRules(answers)).toBe(legacy);
  });

  it("integracje z innymi systemami zerowane przez CRM!Q5 mimo zaznaczonych integracji", () => {
    const answers = emptyCalculatorAnswers();
    answers.addons.integracjeZInnymiSystemami = true;
    answers.platneIntegracjeZInnymiSystemami = false;
    answers.integracjaKlimatyzacja = true;
    answers.integracjaPompaCiepla = true;

    expect(legacyAddonsNet(answers)).toBe(0);
    expect(dodatkiTotalFromRules(answers)).toBe(0);
  });

  it("żaden dodatek niezaznaczony — 0 zł", () => {
    const answers = emptyCalculatorAnswers();
    expect(legacyAddonsNet(answers)).toBe(0);
    expect(dodatkiTotalFromRules(answers)).toBe(0);
  });
});

describe("rules-engine — kategoria 'dodatki' identyczna z calculateAddons (szeroki przegląd kombinacji)", () => {
  it(
    "setki losowo-strukturalnych kombinacji dają identyczny wynik co grosz do grosza",
    () => {
      const trudnyKlientWarianty = [1, 1.1, 1.15, 1.3];
      const oknaFabryczneWarianty = [false, true];
      const platneIntegracjeWarianty = [false, true];
      const oswSciemnianeWarianty = [0, 1, 4, 9, 22]; // różne reszty z dzielenia przez 4

      const failures: string[] = [];
      let scenarioCount = 0;

      // Dla każdego pojedynczego dodatku osobno + kombinacje z resztą parametrów
      for (const key of CALCULATOR_ADDON_KEYS) {
        for (const trudny of trudnyKlientWarianty) {
          for (const oknaFabryczne of oknaFabryczneWarianty) {
            for (const platneIntegracje of platneIntegracjeWarianty) {
              for (const oswSciemniane of oswSciemnianeWarianty) {
                scenarioCount++;
                const answers = emptyCalculatorAnswers();
                answers.addons[key] = true;
                answers.trudnyKlientWspolczynnik = trudny;
                answers.czyOknaCzujnikiFabryczne = oknaFabryczne;
                answers.platneIntegracjeZInnymiSystemami = platneIntegracje;
                answers.iloscOswSciemniane = oswSciemniane;
                answers.liczbaOkienOtwieranych = 7;
                answers.iloscKlawiaturNfc = 4;
                answers.iloscElektrozaczepow = 3;
                answers.integracjaKlimatyzacja = true;
                answers.integracjaWentylacja = false;
                answers.integracjaRekuperacja = true;
                answers.integracjaPompaCiepla = false;

                const legacy = legacyAddonsNet(answers);
                const rules = dodatkiTotalFromRules(answers);

                if (rules !== legacy) {
                  failures.push(
                    `key=${key} trudny=${trudny} oknaFabryczne=${oknaFabryczne} platneIntegracje=${platneIntegracje} oswSciemniane=${oswSciemniane}: legacy=${legacy} rules=${rules} (różnica ${(rules - legacy).toFixed(4)})`,
                  );
                }
              }
            }
          }
        }
      }

      // Wszystkie 22 dodatki zaznaczone naraz, różne trudny klient
      for (const trudny of trudnyKlientWarianty) {
        scenarioCount++;
        const answers = emptyCalculatorAnswers();
        for (const key of CALCULATOR_ADDON_KEYS) {
          answers.addons[key] = true;
        }
        answers.trudnyKlientWspolczynnik = trudny;
        answers.liczbaOkienOtwieranych = 10;
        answers.iloscKlawiaturNfc = 2;
        answers.iloscElektrozaczepow = 1;
        answers.iloscOswSciemniane = 13;
        answers.platneIntegracjeZInnymiSystemami = true;
        answers.integracjaKlimatyzacja = true;
        answers.integracjaWentylacja = true;
        answers.integracjaRekuperacja = true;
        answers.integracjaPompaCiepla = true;

        const legacy = legacyAddonsNet(answers);
        const rules = dodatkiTotalFromRules(answers);
        if (rules !== legacy) {
          failures.push(`WSZYSTKIE trudny=${trudny}: legacy=${legacy} rules=${rules} (różnica ${(rules - legacy).toFixed(4)})`);
        }
      }

      expect(scenarioCount).toBeGreaterThan(1500);
      expect(failures.slice(0, 20)).toEqual([]);
    },
    20000,
  );
});
