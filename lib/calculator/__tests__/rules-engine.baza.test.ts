import { describe, expect, it } from "vitest";
import { calculateBaseSystem } from "@/lib/calculator/engine";
import { buildScope, evaluateRules } from "@/lib/calculator/rules-engine";
import { DEFAULT_CALCULATOR_RULES } from "@/lib/calculator/rules-types";
import { DEFAULT_CALCULATOR_SETTINGS } from "@/lib/calculator/settings";
import { emptyCalculatorAnswers, type CalculatorAnswers } from "@/lib/calculator/types";

/**
 * Weryfikacja RÓWNOWAŻNOŚCI: silnik regułowy (rules-engine.ts + DEFAULT_CALCULATOR_RULES) musi
 * dawać IDENTYCZNY wynik co dziś zaufany, zweryfikowany przeciw realnym ofertom calculateBaseSystem
 * z engine.ts — nie porównujemy z ręcznie wyliczonymi liczbami (ryzyko pomyłki w teście), tylko
 * bezpośrednio silnik ze silnikiem, na tych samych answers. To jest bramka "nic nie tracimy" przy
 * migracji z kodu na reguły edytowalne w aplikacji.
 */

function bazaTotalFromRules(answers: CalculatorAnswers): number {
  const scope = buildScope(answers, DEFAULT_CALCULATOR_SETTINGS);
  const result = evaluateRules(DEFAULT_CALCULATOR_RULES, scope);
  return result.totalsByCategory.baza ?? 0;
}

describe("rules-engine — kategoria 'baza' identyczna z calculateBaseSystem (realne przykłady)", () => {
  it("2647-08-26-852: jedna kondygnacja, bez odległości/KNX", () => {
    const answers = emptyCalculatorAnswers();
    answers.liczbaKondygnacji = 1;
    const legacy = calculateBaseSystem(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(bazaTotalFromRules(answers)).toBe(legacy.totalNet);
  });

  it("Dewódzki: 3 kondygnacje, 90 km, KNX, wszystkie 5 funkcjonalności, wspolczynnikProjekt=2.5", () => {
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
    answers.korzystamZArchitekta = true;
    answers.planujeRolety = true;
    answers.liczbaRolet = 14;
    answers.sterowanieOgrodem = true;
    answers.scenyOswietleniowe = true;
    answers.sterowanieTemperatura = true;
    answers.alarmIKontrolaDostepu = true;
    answers.ledySciemniane = 36;
    answers.strefyOgrzewaniaPodlogowego = 16;
    answers.iloscOswietlenZewnetrznych = 4;
    answers.iloscSekcjiPodlewania = 4;
    answers.addons.czujnikiOtwarciaOkien = true;

    const legacy = calculateBaseSystem(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(legacy.bazaZasilanieNet).toBe(15437.2); // znana, zweryfikowana wartość (patrz engine.test.ts)
    expect(bazaTotalFromRules(answers)).toBe(legacy.totalNet);
  });

  it("Gorzelak: 2 kondygnacje, 25 km, bez KNX, wszystkie 5 funkcjonalności, trudnyKlient=1.1", () => {
    const answers = emptyCalculatorAnswers();
    answers.liczbaKondygnacji = 2;
    answers.trudnyKlientWspolczynnik = 1.1;
    answers.liczbaSypialniDodatkowych = 3;
    answers.ledySciemniane = 24;
    answers.rozszerzenieKnx = false;
    answers.odlegloscKm = 25;
    answers.alarmIKontrolaDostepu = true;
    answers.sterowanieTemperatura = true;
    answers.planujeRolety = true;
    answers.sterowanieOgrodem = true;
    answers.scenyOswietleniowe = true;
    answers.addons.czujnikiOtwarciaOkien = true;

    const legacy = calculateBaseSystem(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(legacy.bazaZasilanieNet).toBe(9483.92); // znana, zweryfikowana wartość (patrz engine.test.ts)
    expect(bazaTotalFromRules(answers)).toBe(legacy.totalNet);
  });
});

describe("rules-engine — kategoria 'baza' identyczna z calculateBaseSystem (szeroki przegląd kombinacji)", () => {
  it(
    "dziesiątki losowo-strukturalnych kombinacji dają identyczny wynik co grosz do grosza",
    () => {
    const kondygnacje = [1, 2, 3];
    const odleglosci = [0, 25, 79, 80, 81, 90, 121, 150];
    const knxWarianty = [false, true];
    const tylkoRozdzielniaWarianty = [false, true];
    const trudnyKlientWarianty = [1, 1.1, 1.2];
    const ledyWarianty = [0, 4, 9, 22, 24]; // 9 i 22 celowo NIE są wielokrotnością 3 (rgbwModuleQty/3)
    const wspolczynnikiProjekt = [1, 2.5];
    const wspolczynnikiRozdzielnica = [1, 1.2];
    const powierzchnie = [60, 399, 400, 450];

    const failures: string[] = [];
    let scenarioCount = 0;

    for (const k of kondygnacje) {
      for (const d of odleglosci) {
        for (const knx of knxWarianty) {
          for (const tylkoRozdz of tylkoRozdzielniaWarianty) {
            for (const trudny of trudnyKlientWarianty) {
              for (const ledy of ledyWarianty) {
                for (const wspProjekt of wspolczynnikiProjekt) {
                  for (const wspRozdz of wspolczynnikiRozdzielnica) {
                    for (const powierzchnia of powierzchnie) {
                      scenarioCount++;
                      const answers = emptyCalculatorAnswers();
                      answers.liczbaKondygnacji = k;
                      answers.odlegloscKm = d;
                      answers.rozszerzenieKnx = knx;
                      answers.tylkoRozdzielnia = tylkoRozdz;
                      answers.trudnyKlientWspolczynnik = trudny;
                      answers.ledySciemniane = ledy;
                      answers.wspolczynnikProjekt = wspProjekt;
                      answers.wspolczynnikRozdzielnica = wspRozdz;
                      answers.powierzchniaM2 = powierzchnia;
                      // naprzemienne funkcjonalności/dodatki żeby uderzyć w różne gałęzie logistyki i punktów elektrycznych
                      answers.strefaPrywatna = k % 2 === 0;
                      answers.strefaOtwarta = d % 2 === 0;
                      answers.komunikacja = ledy > 0;
                      answers.liczbaSypialniDodatkowych = (k + ledyWarianty.indexOf(ledy)) % 5;
                      answers.liczbaPomieszczenWilgotnych = k % 3;
                      answers.liczbaPozostalychPomieszczen = d % 4;
                      answers.iloscGarazy = k > 1 ? 1 : 0;
                      answers.korzystamZArchitekta = trudny > 1;
                      answers.planujeRolety = wspProjekt !== 1;
                      answers.liczbaRolet = answers.planujeRolety ? 8 : 0;
                      answers.sterowanieOgrodem = wspRozdz !== 1;
                      answers.iloscOswietlenZewnetrznych = answers.sterowanieOgrodem ? 4 : 0;
                      answers.iloscSekcjiPodlewania = answers.sterowanieOgrodem ? 4 : 0;
                      answers.scenyOswietleniowe = ledy > 0;
                      answers.sterowanieTemperatura = powierzchnia > 300;
                      answers.strefyOgrzewaniaPodlogowego = answers.sterowanieTemperatura ? 10 : 0;
                      answers.alarmIKontrolaDostepu = !tylkoRozdz && k === 2;
                      answers.addons.czujnikiOtwarciaOkien = d > 0;
                      answers.liczbaOkienOtwieranych = answers.addons.czujnikiOtwarciaOkien ? 6 : 0;
                      answers.addons.dodatkowyZasilaczUps = ledy === 24;
                      answers.instalacjaDoTelewizjiLubLan = k === 3;
                      answers.instalacjaDoGlosnikow = d === 90;
                      answers.instalacjaDoMonitoringu = powierzchnia === 450;
                      answers.iloscKamerMonitoringu = answers.instalacjaDoMonitoringu ? 6 : 0;

                      const legacy = calculateBaseSystem(answers, DEFAULT_CALCULATOR_SETTINGS);
                      const rulesTotal = bazaTotalFromRules(answers);

                      if (rulesTotal !== legacy.totalNet) {
                        failures.push(
                          `k=${k} d=${d} knx=${knx} tylkoRozdz=${tylkoRozdz} trudny=${trudny} ledy=${ledy} wspProjekt=${wspProjekt} wspRozdz=${wspRozdz} pow=${powierzchnia}: legacy=${legacy.totalNet} rules=${rulesTotal} (różnica ${(rulesTotal - legacy.totalNet).toFixed(4)})`,
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

    expect(scenarioCount).toBeGreaterThan(15000);
    expect(failures.slice(0, 20)).toEqual([]);
    },
    20000,
  );
});
