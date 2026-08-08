import { describe, expect, it } from "vitest";
import { calculateFunctionalBudgets } from "@/lib/calculator/engine";
import { buildScope, evaluateRules } from "@/lib/calculator/rules-engine";
import { DEFAULT_CALCULATOR_RULES } from "@/lib/calculator/rules-types";
import { DEFAULT_CALCULATOR_SETTINGS } from "@/lib/calculator/settings";
import { emptyCalculatorAnswers, type CalculatorAnswers } from "@/lib/calculator/types";

/**
 * Weryfikacja RÓWNOWAŻNOŚCI kategorii "Funkcjonalne" (Oświetlenie/Bezpieczeństwo/Temperatura/
 * Rolety/Zewnętrzne) — silnik regułowy porównany bezpośrednio z zaufanym calculateFunctionalBudgets
 * z engine.ts, na tych samych answers. Patrz rules-engine.baza.test.ts po uzasadnienie metody.
 */

function funkcjonalneTotalFromRules(answers: CalculatorAnswers): number {
  const scope = buildScope(answers, DEFAULT_CALCULATOR_SETTINGS);
  const result = evaluateRules(DEFAULT_CALCULATOR_RULES, scope);
  return result.totalsByCategory.funkcjonalne ?? 0;
}

function legacyFunctionalNet(answers: CalculatorAnswers): number {
  // Tak samo jak calculateCalculatorTotals w engine.ts liczy functionalNet: roundMoney(suma) — bez
  // tego zaokrąglenia porównanie łapałoby tylko szum reprezentacji zmiennoprzecinkowej (np.
  // 8603.050000000001 zamiast 8603.05), nie prawdziwe rozbieżności.
  const sum = calculateFunctionalBudgets(answers, DEFAULT_CALCULATOR_SETTINGS).reduce((s, item) => s + item.net, 0);
  return Math.round(sum * 100) / 100;
}

describe("rules-engine — kategoria 'funkcjonalne' identyczna z calculateFunctionalBudgets (realne przykłady)", () => {
  it("Dewódzki: wszystkie 5 kategorii aktywne, SATEL=true", () => {
    const answers = emptyCalculatorAnswers();
    answers.strefaPrywatna = true;
    answers.strefaOtwarta = true;
    answers.komunikacja = true;
    answers.liczbaSypialniDodatkowych = 5;
    answers.liczbaPomieszczenWilgotnych = 7;
    answers.liczbaPozostalychPomieszczen = 3;
    answers.iloscGarazy = 3;
    answers.liczbaDrzwiWejsciowych = 2;
    answers.liczbaWyjscNaTaras = 1;
    answers.czyOknaCzujnikiFabryczne = false;
    answers.jestKominek = true;
    answers.jestGaz = true;
    answers.planujeRolety = true;
    answers.liczbaRolet = 14;
    answers.sterowanieOgrodem = true;
    answers.scenyOswietleniowe = true;
    answers.sterowanieTemperatura = true;
    answers.alarmIKontrolaDostepu = true;
    answers.ledySciemniane = 36;
    answers.czyCzujkiRecznie = true;
    answers.iloscCzujekLoxone = 33;
    answers.iloscCzujekSatel = 8;
    answers.iloscCzujekBezpieczenstwa = 9;
    answers.satelWOptimum = true;
    answers.strefyOgrzewaniaPodlogowego = 16;
    answers.iloscGrzejnikowSterowanych = 0;
    answers.iloscOswietlenZewnetrznych = 4;
    answers.iloscSekcjiPodlewania = 4;
    answers.trudnyKlientWspolczynnik = 1.2;

    const legacy = legacyFunctionalNet(answers);
    expect(legacy).toBe(39783.96 + 35128.14 + 16912.81 + 5243.28 + 5961); // znane, zweryfikowane wartości (patrz engine.test.ts)
    expect(funkcjonalneTotalFromRules(answers)).toBe(legacy);
  });

  it("bez żadnej funkcjonalności — 0 zł", () => {
    const answers = emptyCalculatorAnswers();
    expect(legacyFunctionalNet(answers)).toBe(0);
    expect(funkcjonalneTotalFromRules(answers)).toBe(0);
  });

  it("tylko rozdzielnia zeruje bezpieczeństwo mimo zaznaczonego alarmu", () => {
    const answers = emptyCalculatorAnswers();
    answers.alarmIKontrolaDostepu = true;
    answers.tylkoRozdzielnia = true;
    expect(legacyFunctionalNet(answers)).toBe(0);
    expect(funkcjonalneTotalFromRules(answers)).toBe(0);
  });
});

describe("rules-engine — kategoria 'funkcjonalne' identyczna z calculateFunctionalBudgets (szeroki przegląd kombinacji)", () => {
  it(
    "setki losowo-strukturalnych kombinacji dają identyczny wynik co grosz do grosza",
    () => {
      const satelWarianty = [false, true];
      const czyCzujkiRecznieWarianty = [false, true];
      const tylkoRozdzielniaWarianty = [false, true];
      const trudnyKlientWarianty = [1, 1.15, 1.3];
      const outdoorWarianty = [1, 1.1, 1.4];
      const ledyWarianty = [0, 9, 22, 36]; // 9 i 22 celowo NIE wielokrotnością 3
      const roletyWarianty = [0, 5, 13, 14];
      const pomieszczeniaZOknamiWarianty = [0, 2, 5, 10];

      const failures: string[] = [];
      let scenarioCount = 0;

      for (const satel of satelWarianty) {
        for (const recznie of czyCzujkiRecznieWarianty) {
          for (const tylkoRozdz of tylkoRozdzielniaWarianty) {
            for (const trudny of trudnyKlientWarianty) {
              for (const outdoor of outdoorWarianty) {
                for (const ledy of ledyWarianty) {
                  for (const rolety of roletyWarianty) {
                    for (const oknami of pomieszczeniaZOknamiWarianty) {
                      scenarioCount++;
                      const answers = emptyCalculatorAnswers();
                      answers.satelWOptimum = satel;
                      answers.czyCzujkiRecznie = recznie;
                      answers.tylkoRozdzielnia = tylkoRozdz;
                      answers.trudnyKlientWspolczynnik = trudny;
                      answers.wspolczynnikOutdoor = outdoor;
                      answers.ledySciemniane = ledy;
                      answers.liczbaRolet = rolety;
                      answers.liczbaPomieszczenZOknami = oknami;

                      answers.iloscCzujekLoxone = recznie ? 5 : 0;
                      answers.iloscCzujekSatel = recznie ? 4 : 0;
                      answers.iloscCzujekBezpieczenstwa = recznie ? 3 : 0;

                      answers.strefaPrywatna = satel;
                      answers.strefaOtwarta = !satel;
                      answers.komunikacja = ledy > 0;
                      answers.liczbaSypialniDodatkowych = ledy > 0 ? 2 : 0;
                      answers.liczbaPomieszczenWilgotnych = oknami % 3;
                      answers.liczbaPozostalychPomieszczen = rolety % 4;
                      answers.iloscGarazy = trudny === 1.3 ? 2 : 0;
                      answers.liczbaDrzwiWejsciowych = 1;
                      answers.liczbaWyjscNaTaras = outdoor === 1.4 ? 1 : 0;
                      answers.czyOknaCzujnikiFabryczne = oknami > 5;
                      answers.jestKominek = ledy === 22;
                      answers.jestGaz = ledy === 36;

                      answers.scenyOswietleniowe = ledy > 0 || oknami > 0;
                      answers.alarmIKontrolaDostepu = !tylkoRozdz;
                      answers.sterowanieTemperatura = rolety > 0;
                      answers.strefyOgrzewaniaPodlogowego = answers.sterowanieTemperatura ? oknami + 1 : 0;
                      answers.iloscGrzejnikowSterowanych = answers.sterowanieTemperatura ? 3 : 0;
                      answers.planujeRolety = rolety > 0;
                      answers.sterowanieOgrodem = outdoor !== 1;
                      answers.iloscOswietlenZewnetrznych = answers.sterowanieOgrodem ? oknami : 0;
                      answers.iloscSekcjiPodlewania = answers.sterowanieOgrodem ? rolety : 0;

                      const legacy = legacyFunctionalNet(answers);
                      const rules = funkcjonalneTotalFromRules(answers);

                      if (rules !== legacy) {
                        failures.push(
                          `satel=${satel} recznie=${recznie} tylkoRozdz=${tylkoRozdz} trudny=${trudny} outdoor=${outdoor} ledy=${ledy} rolety=${rolety} oknami=${oknami}: legacy=${legacy} rules=${rules} (różnica ${(rules - legacy).toFixed(4)})`,
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      expect(scenarioCount).toBeGreaterThan(3000);
      expect(failures.slice(0, 20)).toEqual([]);
    },
    20000,
  );
});
