import { describe, expect, it } from "vitest";
import { calculateCalculatorTotals } from "@/lib/calculator/engine";
import { buildScope, evaluateRules } from "@/lib/calculator/rules-engine";
import { DEFAULT_CALCULATOR_RULES } from "@/lib/calculator/rules-types";
import { DEFAULT_CALCULATOR_SETTINGS } from "@/lib/calculator/settings";
import { emptyCalculatorAnswers, type CalculatorAnswers } from "@/lib/calculator/types";

/**
 * Weryfikacja RÓWNOWAŻNOŚCI całościowej sumy oferty — silnik regułowy (WSZYSTKIE 5 kategorii +
 * rabat płatności z góry naraz) porównany bezpośrednio z zaufanym calculateCalculatorTotals z
 * engine.ts. To jest ostateczna bramka "nic nie tracimy" całej migracji z kodu na reguły.
 */

function totalFromRules(answers: CalculatorAnswers): number {
  const scope = buildScope(answers, DEFAULT_CALCULATOR_SETTINGS);
  return evaluateRules(DEFAULT_CALCULATOR_RULES, scope).total;
}

describe("rules-engine — suma całkowita identyczna z calculateCalculatorTotals (realne przykłady)", () => {
  it("2647-08-26-852: jedna kondygnacja, bez dodatkowych opcji", () => {
    const answers = emptyCalculatorAnswers();
    answers.liczbaKondygnacji = 1;
    const legacy = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(totalFromRules(answers)).toBe(legacy.totalNet);
  });

  it("Dewódzki: 3 kondygnacje, wszystkie kategorie funkcjonalne + dodatki + płatność z góry", () => {
    const answers = emptyCalculatorAnswers();
    answers.liczbaKondygnacji = 3;
    answers.odlegloscKm = 90;
    answers.rozszerzenieKnx = true;
    answers.trudnyKlientWspolczynnik = 1.2;
    answers.wspolczynnikProjekt = 2.5;
    answers.strefaPrywatna = true;
    answers.strefaOtwarta = true;
    answers.komunikacja = true;
    answers.liczbaSypialniDodatkowych = 5;
    answers.liczbaPomieszczenWilgotnych = 7;
    answers.liczbaPozostalychPomieszczen = 3;
    answers.iloscGarazy = 3;
    answers.liczbaDrzwiWejsciowych = 2;
    answers.liczbaWyjscNaTaras = 1;
    answers.liczbaOkienOtwieranych = 12;
    answers.czyOknaCzujnikiFabryczne = false;
    answers.korzystamZArchitekta = true;
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
    answers.iloscOswietlenZewnetrznych = 4;
    answers.iloscSekcjiPodlewania = 4;
    answers.addons.stacjaPogodowa = true;
    answers.addons.czujnikiOtwarciaOkien = true;
    answers.addons.przygotowanieDostepuDrzwi = true;
    answers.iloscElektrozaczepow = 1;
    answers.addons.klawiaturyNfc = true;
    answers.iloscKlawiaturNfc = 1;
    answers.addons.oswietlenieAwaryjne = true;
    answers.addons.bezpieczenstwoPlusPlusPlus = true;
    answers.addons.oswietlenieSciemniane230V = true;
    answers.iloscOswSciemniane = 4;
    answers.addons.stacjaDokujacaIpad = true;
    answers.addons.ipad = true;
    answers.addons.integracjeZInnymiSystemami = true;
    answers.integracjaKlimatyzacja = true;
    answers.integracjaRekuperacja = true;
    answers.integracjaPompaCiepla = true;
    answers.addons.dodatkowyLicznikPradu = true;
    answers.platnoscZGory = true;

    const legacy = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(totalFromRules(answers)).toBe(legacy.totalNet);
  });

  it("Gorzelak: 2 kondygnacje, inne systemy + elektryka kompleksowa + płatność z góry", () => {
    const answers = emptyCalculatorAnswers();
    answers.liczbaKondygnacji = 2;
    answers.trudnyKlientWspolczynnik = 1.1;
    answers.rozszerzenieKnx = false;
    answers.odlegloscKm = 25;
    answers.otherSystems.sieciLan = true;
    answers.szafkaRackLan = true;
    answers.iloscAP = 5;
    answers.otherSystems.wideodomofon = true;
    answers.loxoneDoplataWideodomofon = true;
    answers.otherSystems.monitoring = true;
    answers.monitoringRejestrator = true;
    answers.monitoring8Mpx = false;
    answers.iloscKamerMonitoringu = 6;
    answers.otherSystems.multiroom = true;
    answers.iloscStrefMultiroom = 6;
    answers.iloscGlosnikowMultiroom = 8;
    answers.iloscSkrzynekMultiroom = 0;
    answers.kompleksowaInstalacja = true;
    answers.strefaPrywatna = true;
    answers.strefaOtwarta = true;
    answers.iloscGarazy = 1;
    answers.platnoscZGory = true;

    const legacy = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(totalFromRules(answers)).toBe(legacy.totalNet);
  });

  it("dom bez żadnych opcji — same pozycje zawsze wliczone", () => {
    const answers = emptyCalculatorAnswers();
    const legacy = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(totalFromRules(answers)).toBe(legacy.totalNet);
  });
});

describe("rules-engine — suma całkowita identyczna z calculateCalculatorTotals (szeroki przegląd kombinacji)", () => {
  it(
    "setki losowo-strukturalnych kombinacji dotykających wszystkich 5 kategorii naraz",
    () => {
      const platnoscZGoryWarianty = [false, true];
      const kompleksowaWarianty = [false, true];
      const trudnyKlientWarianty = [1, 1.15, 1.3];
      const kondygnacjeWarianty = [1, 2, 3];
      const odlegloscWarianty = [0, 60, 130];
      const ledyWarianty = [0, 9, 24];
      const iloscGarazyWarianty = [0, 2];

      const failures: string[] = [];
      let scenarioCount = 0;

      for (const platnoscZGory of platnoscZGoryWarianty) {
        for (const kompleksowa of kompleksowaWarianty) {
          for (const trudny of trudnyKlientWarianty) {
            for (const kondygnacje of kondygnacjeWarianty) {
              for (const odleglosc of odlegloscWarianty) {
                for (const ledy of ledyWarianty) {
                  for (const garaze of iloscGarazyWarianty) {
                    scenarioCount++;
                    const answers = emptyCalculatorAnswers();
                    answers.platnoscZGory = platnoscZGory;
                    answers.kompleksowaInstalacja = kompleksowa;
                    answers.trudnyKlientWspolczynnik = trudny;
                    answers.liczbaKondygnacji = kondygnacje;
                    answers.odlegloscKm = odleglosc;
                    answers.ledySciemniane = ledy;
                    answers.iloscGarazy = garaze;

                    // dotknij po jednej opcji z każdej kategorii naraz
                    answers.strefaPrywatna = kondygnacje > 1;
                    answers.strefaOtwarta = garaze > 0;
                    answers.komunikacja = ledy > 0;
                    answers.liczbaSypialniDodatkowych = kondygnacje;
                    answers.scenyOswietleniowe = ledy > 0;
                    answers.alarmIKontrolaDostepu = trudny > 1;
                    answers.sterowanieTemperatura = kondygnacje === 2;
                    answers.strefyOgrzewaniaPodlogowego = answers.sterowanieTemperatura ? 8 : 0;
                    answers.planujeRolety = odleglosc > 0;
                    answers.liczbaRolet = answers.planujeRolety ? 6 : 0;
                    answers.sterowanieOgrodem = kompleksowa;
                    answers.iloscOswietlenZewnetrznych = answers.sterowanieOgrodem ? 4 : 0;
                    answers.iloscSekcjiPodlewania = answers.sterowanieOgrodem ? 4 : 0;
                    answers.instalacjaDoMonitoringu = platnoscZGory;
                    answers.iloscKamerMonitoringu = answers.instalacjaDoMonitoringu ? 4 : 0;
                    answers.addons.stacjaPogodowa = kondygnacje === 3;
                    answers.addons.czujnikiOtwarciaOkien = odleglosc > 0;
                    answers.liczbaOkienOtwieranych = answers.addons.czujnikiOtwarciaOkien ? 5 : 0;
                    answers.otherSystems.sieciLan = ledy > 0;
                    answers.iloscAP = answers.otherSystems.sieciLan ? 3 : 0;
                    answers.otherSystems.sauna = kompleksowa && trudny > 1;

                    const legacy = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
                    const rules = totalFromRules(answers);

                    if (rules !== legacy.totalNet) {
                      failures.push(
                        `platnoscZGory=${platnoscZGory} kompleksowa=${kompleksowa} trudny=${trudny} kondygnacje=${kondygnacje} odleglosc=${odleglosc} ledy=${ledy} garaze=${garaze}: legacy=${legacy.totalNet} rules=${rules} (różnica ${(rules - legacy.totalNet).toFixed(4)})`,
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }

      expect(scenarioCount).toBeGreaterThan(500);
      expect(failures.slice(0, 20)).toEqual([]);
    },
    20000,
  );
});
