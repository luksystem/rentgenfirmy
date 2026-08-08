import { describe, expect, it } from "vitest";
import { calculateOtherSystems } from "@/lib/calculator/engine";
import { buildScope, evaluateRules } from "@/lib/calculator/rules-engine";
import { DEFAULT_CALCULATOR_RULES } from "@/lib/calculator/rules-types";
import { DEFAULT_CALCULATOR_SETTINGS } from "@/lib/calculator/settings";
import { emptyCalculatorAnswers, type CalculatorAnswers } from "@/lib/calculator/types";

/**
 * Weryfikacja RÓWNOWAŻNOŚCI kategorii "Inne systemy" — silnik regułowy porównany bezpośrednio z
 * zaufanym calculateOtherSystems z engine.ts. Patrz rules-engine.baza.test.ts po uzasadnienie metody.
 */

function inneSystemyTotalFromRules(answers: CalculatorAnswers): number {
  const scope = buildScope(answers, DEFAULT_CALCULATOR_SETTINGS);
  const result = evaluateRules(DEFAULT_CALCULATOR_RULES, scope);
  return result.totalsByCategory.inne_systemy ?? 0;
}

describe("rules-engine — kategoria 'inne_systemy' identyczna z calculateOtherSystems (realne przykłady)", () => {
  it("realny przykład: LAN+Wideodomofon+Monitoring+Multiroom, DANE!T119=32164 przed rabatem", () => {
    const answers = emptyCalculatorAnswers();
    answers.otherSystems.sieciLan = true;
    answers.szafkaRackLan = true;
    answers.iloscAP = 6;
    answers.otherSystems.wideodomofon = true;
    answers.loxoneDoplataWideodomofon = true;
    answers.otherSystems.monitoring = true;
    answers.monitoringRejestrator = true;
    answers.monitoring8Mpx = true;
    answers.iloscKamerMonitoringu = 8;
    answers.otherSystems.multiroom = true;
    answers.iloscStrefMultiroom = 2;
    answers.iloscGlosnikowMultiroom = 4;
    answers.iloscSkrzynekMultiroom = 0;

    const legacy = calculateOtherSystems(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(legacy.selectedNet).toBe(32164);
    expect(inneSystemyTotalFromRules(answers)).toBe(legacy.finalNet);
  });

  it("Gorzelak: LAN+Wideodomofon+Monitoring+Multiroom, DANE!T119=31598 (selectedNet, przed rabatem)", () => {
    const answers = emptyCalculatorAnswers();
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

    const legacy = calculateOtherSystems(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(legacy.selectedNet).toBe(31598);
    expect(inneSystemyTotalFromRules(answers)).toBe(legacy.finalNet);
  });

  it("wszystkie 8 systemów zaznaczone naraz, alarm tymczasowy ze współczynnikiem", () => {
    const answers = emptyCalculatorAnswers();
    answers.otherSystems.sieciLan = true;
    answers.otherSystems.telewizja = true;
    answers.otherSystems.wideodomofon = true;
    answers.otherSystems.monitoring = true;
    answers.otherSystems.naglosnienie = true;
    answers.otherSystems.multiroom = true;
    answers.otherSystems.sauna = true;
    answers.otherSystems.alarmTymczasowy = true;
    answers.szafkaRackLan = true;
    answers.iloscAP = 3;
    answers.multiswitchTv = true;
    answers.szafaRackTv = true;
    answers.loxoneDoplataWideodomofon = false;
    answers.monitoringRejestrator = false;
    answers.monitoring8Mpx = true;
    answers.iloscKamerMonitoringu = 10;
    answers.iloscStrefMultiroom = 3;
    answers.iloscGlosnikowMultiroom = 5;
    answers.iloscSkrzynekMultiroom = 2;
    answers.glosnikWcNaglosnienie = true;
    answers.wspolczynnikAlarmTymczasowy = 1.2;

    const legacy = calculateOtherSystems(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(inneSystemyTotalFromRules(answers)).toBe(legacy.finalNet);
  });

  it("żaden system niezaznaczony — 0 zł", () => {
    const answers = emptyCalculatorAnswers();
    expect(calculateOtherSystems(answers, DEFAULT_CALCULATOR_SETTINGS).finalNet).toBe(0);
    expect(inneSystemyTotalFromRules(answers)).toBe(0);
  });
});

describe("rules-engine — kategoria 'inne_systemy' identyczna z calculateOtherSystems (szeroki przegląd kombinacji)", () => {
  it(
    "setki losowo-strukturalnych kombinacji dają identyczny wynik co grosz do grosza",
    () => {
      const systemKeys = ["sieciLan", "telewizja", "wideodomofon", "monitoring", "naglosnienie", "multiroom", "sauna", "alarmTymczasowy"] as const;
      const monitoring8MpxWarianty = [false, true];
      const rejestratorWarianty = [false, true];
      const kameryWarianty = [0, 6, 8, 9, 12];
      const strefyWarianty = [0, 3, 4, 5, 9];
      const alarmWspWarianty = [1, 1.1, 1.3];

      const failures: string[] = [];
      let scenarioCount = 0;

      // Każdy system osobno
      for (const key of systemKeys) {
        for (const rejestrator of rejestratorWarianty) {
          for (const mpx of monitoring8MpxWarianty) {
            for (const kamery of kameryWarianty) {
              for (const strefy of strefyWarianty) {
                for (const alarmWsp of alarmWspWarianty) {
                  scenarioCount++;
                  const answers = emptyCalculatorAnswers();
                  answers.otherSystems[key] = true;
                  answers.monitoringRejestrator = rejestrator;
                  answers.monitoring8Mpx = mpx;
                  answers.iloscKamerMonitoringu = kamery;
                  answers.iloscStrefMultiroom = strefy;
                  answers.iloscGlosnikowMultiroom = strefy;
                  answers.iloscSkrzynekMultiroom = strefy % 3;
                  answers.wspolczynnikAlarmTymczasowy = alarmWsp;
                  answers.szafkaRackLan = kamery % 2 === 0;
                  answers.iloscAP = kamery;
                  answers.multiswitchTv = strefy % 2 === 0;
                  answers.szafaRackTv = rejestrator;
                  answers.loxoneDoplataWideodomofon = mpx;
                  answers.glosnikWcNaglosnienie = rejestrator;

                  const legacy = calculateOtherSystems(answers, DEFAULT_CALCULATOR_SETTINGS);
                  const rules = inneSystemyTotalFromRules(answers);

                  if (rules !== legacy.finalNet) {
                    failures.push(
                      `key=${key} rejestrator=${rejestrator} mpx=${mpx} kamery=${kamery} strefy=${strefy} alarmWsp=${alarmWsp}: legacy=${legacy.finalNet} rules=${rules} (różnica ${(rules - legacy.finalNet).toFixed(4)})`,
                    );
                  }
                }
              }
            }
          }
        }
      }

      // Kombinacje 2-3-...8 systemów naraz (test proporcjonalnego rabatu na różnych liczbach)
      for (let n = 1; n <= 8; n++) {
        scenarioCount++;
        const answers = emptyCalculatorAnswers();
        for (let i = 0; i < n; i++) {
          answers.otherSystems[systemKeys[i]] = true;
        }
        answers.szafkaRackLan = true;
        answers.iloscAP = 4;
        answers.monitoringRejestrator = true;
        answers.monitoring8Mpx = true;
        answers.iloscKamerMonitoringu = 5;
        answers.iloscStrefMultiroom = 5;
        answers.iloscGlosnikowMultiroom = 6;
        answers.wspolczynnikAlarmTymczasowy = 1.1;

        const legacy = calculateOtherSystems(answers, DEFAULT_CALCULATOR_SETTINGS);
        const rules = inneSystemyTotalFromRules(answers);
        if (rules !== legacy.finalNet) {
          failures.push(`n=${n} systemów: legacy=${legacy.finalNet} rules=${rules} (różnica ${(rules - legacy.finalNet).toFixed(4)})`);
        }
      }

      expect(scenarioCount).toBeGreaterThan(1000);
      expect(failures.slice(0, 20)).toEqual([]);
    },
    20000,
  );
});
