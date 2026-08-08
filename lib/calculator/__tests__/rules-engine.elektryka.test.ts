import { describe, expect, it } from "vitest";
import { calculateElectricalInstallation } from "@/lib/calculator/engine";
import { buildScope, evaluateRules } from "@/lib/calculator/rules-engine";
import { DEFAULT_CALCULATOR_RULES } from "@/lib/calculator/rules-types";
import { DEFAULT_CALCULATOR_SETTINGS } from "@/lib/calculator/settings";
import { emptyCalculatorAnswers, type CalculatorAnswers } from "@/lib/calculator/types";

/**
 * Weryfikacja RÓWNOWAŻNOŚCI kategorii "Elektryka" — silnik regułowy porównany bezpośrednio z
 * zaufanym calculateElectricalInstallation z engine.ts. Patrz rules-engine.baza.test.ts po
 * uzasadnienie metody.
 */

function elektrykaTotalFromRules(answers: CalculatorAnswers): number {
  const scope = buildScope(answers, DEFAULT_CALCULATOR_SETTINGS);
  const result = evaluateRules(DEFAULT_CALCULATOR_RULES, scope);
  return result.totalsByCategory.elektryka ?? 0;
}

describe("rules-engine — kategoria 'elektryka' identyczna z calculateElectricalInstallation (realne przykłady)", () => {
  it("dom bez żadnych opcji — tylko pozycje zawsze wliczone", () => {
    const answers = emptyCalculatorAnswers();
    const legacy = calculateElectricalInstallation(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(elektrykaTotalFromRules(answers)).toBe(legacy.finalNet);
  });

  it("dużo opcji naraz, kompleksowa instalacja z rabatem", () => {
    const answers = emptyCalculatorAnswers();
    answers.strefaPrywatna = true;
    answers.strefaOtwarta = true;
    answers.komunikacja = true;
    answers.liczbaSypialniDodatkowych = 4;
    answers.liczbaPomieszczenWilgotnych = 3;
    answers.liczbaPozostalychPomieszczen = 2;
    answers.iloscGarazy = 2;
    answers.iloscPrzyciskowPrestiz = 3;
    answers.planujeRolety = true;
    answers.liczbaRolet = 10;
    answers.sterowanieOgrodem = true;
    answers.instalacjaDoGlosnikow = true;
    answers.instalacjaDoMonitoringu = true;
    answers.iloscKamerMonitoringu = 6;
    answers.instalacjaDoTelewizjiLubLan = true;
    answers.kanalyPrzepustyDoTv = true;
    answers.instalacjaMasztuAnteny = true;
    answers.rozdzielniaBudowlana = true;
    answers.przylaczeDoDomu = true;
    answers.dlugoscPrzylaczaM = 15;
    answers.formalnosciOdbiorowe = true;
    answers.pomiaryWewnetrzne = true;
    answers.dodatkoweBruzdowanieM = 8;
    answers.kompleksowaInstalacja = true;

    const legacy = calculateElectricalInstallation(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(legacy.discountNet).toBeGreaterThan(0);
    expect(elektrykaTotalFromRules(answers)).toBe(legacy.finalNet);
  });

  it("ilości ręcznie nadpisane omijają auto-wyliczenie", () => {
    const answers = emptyCalculatorAnswers();
    answers.iloscObwodowGniazd230V = 40;
    answers.iloscKolejnychGniazdObwody230V = 25;
    answers.iloscGniazd400V = 3;
    answers.iloscObwodowOswietleniaWszystkich = 30;
    answers.iloscOswietleniaKolejne = 15;
    answers.iloscPrzyciskowNormal = 9;
    answers.instalacjaDoGlosnikow = true;
    answers.iloscKabliGlosnikowych = 12;
    answers.instalacjaDoTelewizjiLubLan = true;
    answers.iloscGniazdLanTv = 7;
    answers.kanalyPrzepustyDoTv = true;
    answers.iloscKanalowTv = 5;

    const legacy = calculateElectricalInstallation(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(elektrykaTotalFromRules(answers)).toBe(legacy.finalNet);
  });

  it("odległość powyżej dystansu referencyjnego z niezerową dopłatą za km", () => {
    const settings = {
      ...DEFAULT_CALCULATOR_SETTINGS,
      electrical: {
        ...DEFAULT_CALCULATOR_SETTINGS.electrical,
        doplataZaKmNettoNaPunkt: 0.5,
      },
    };
    const answers = emptyCalculatorAnswers();
    answers.odlegloscKm = 180;
    answers.strefaPrywatna = true;
    answers.strefaOtwarta = true;

    const legacy = calculateElectricalInstallation(answers, settings);
    const scope = buildScope(answers, settings);
    const result = evaluateRules(DEFAULT_CALCULATOR_RULES, scope);
    expect(result.totalsByCategory.elektryka).toBe(legacy.finalNet);
  });
});

describe("rules-engine — kategoria 'elektryka' identyczna z calculateElectricalInstallation (szeroki przegląd kombinacji)", () => {
  it(
    "setki losowo-strukturalnych kombinacji dają identyczny wynik co grosz do grosza",
    () => {
      const kompleksowaWarianty = [false, true];
      const ogrodWarianty = [false, true];
      const glosnikiWarianty = [false, true];
      const monitoringWarianty = [false, true];
      const lanTvWarianty = [false, true];
      const pomiaryWarianty = [false, true];
      const garazeWarianty = [0, 1, 3];
      const sypialnieWarianty = [0, 2, 5];
      const dlugoscPrzylaczaWarianty = [0, 12, 30];

      const failures: string[] = [];
      let scenarioCount = 0;

      for (const kompleksowa of kompleksowaWarianty) {
        for (const ogrod of ogrodWarianty) {
          for (const glosniki of glosnikiWarianty) {
            for (const monitoring of monitoringWarianty) {
              for (const lanTv of lanTvWarianty) {
                for (const pomiary of pomiaryWarianty) {
                  for (const garaze of garazeWarianty) {
                    for (const sypialnie of sypialnieWarianty) {
                      for (const dlugoscPrzylacza of dlugoscPrzylaczaWarianty) {
                        scenarioCount++;
                        const answers = emptyCalculatorAnswers();
                        answers.kompleksowaInstalacja = kompleksowa;
                        answers.sterowanieOgrodem = ogrod;
                        answers.instalacjaDoGlosnikow = glosniki;
                        answers.instalacjaDoMonitoringu = monitoring;
                        answers.iloscKamerMonitoringu = monitoring ? 5 : 0;
                        answers.instalacjaDoTelewizjiLubLan = lanTv;
                        answers.pomiaryWewnetrzne = pomiary;
                        answers.iloscGarazy = garaze;
                        answers.liczbaSypialniDodatkowych = sypialnie;
                        answers.przylaczeDoDomu = dlugoscPrzylacza > 0;
                        answers.dlugoscPrzylaczaM = dlugoscPrzylacza;

                        answers.strefaPrywatna = sypialnie > 0;
                        answers.strefaOtwarta = garaze > 0;
                        answers.komunikacja = kompleksowa;
                        answers.liczbaPomieszczenWilgotnych = garaze;
                        answers.liczbaPozostalychPomieszczen = sypialnie % 3;
                        answers.planujeRolety = ogrod;
                        answers.liczbaRolet = ogrod ? 6 : 0;
                        answers.iloscPrzyciskowPrestiz = kompleksowa ? 2 : 0;
                        answers.kanalyPrzepustyDoTv = lanTv;
                        answers.instalacjaMasztuAnteny = garaze === 3;
                        answers.rozdzielniaBudowlana = sypialnie === 5;
                        answers.formalnosciOdbiorowe = monitoring;
                        answers.dodatkoweBruzdowanieM = dlugoscPrzylacza;
                        answers.korzystamZArchitekta = kompleksowa && ogrod;

                        const legacy = calculateElectricalInstallation(answers, DEFAULT_CALCULATOR_SETTINGS);
                        const rules = elektrykaTotalFromRules(answers);

                        if (rules !== legacy.finalNet) {
                          failures.push(
                            `kompleksowa=${kompleksowa} ogrod=${ogrod} glosniki=${glosniki} monitoring=${monitoring} lanTv=${lanTv} pomiary=${pomiary} garaze=${garaze} sypialnie=${sypialnie} dlugoscPrzylacza=${dlugoscPrzylacza}: legacy=${legacy.finalNet} rules=${rules} (różnica ${(rules - legacy.finalNet).toFixed(4)})`,
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
      }

      expect(scenarioCount).toBeGreaterThan(1500);
      expect(failures.slice(0, 20)).toEqual([]);
    },
    20000,
  );
});
