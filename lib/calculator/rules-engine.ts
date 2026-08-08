/**
 * Silnik odczytujący reguły (CalculatorRule[]) i liczący z nich ceny — docelowa zamiana dla
 * hardcodowanych funkcji w engine.ts. Każda reguła to jedna pozycja cennika (albo pomocnicza
 * wartość pośrednia, patrz `contributesToTotal` w rules-types.ts).
 *
 * Reguły liczone są PO KOLEI, od góry do dołu (jak wiersze w arkuszu kalkulacyjnym) — reguła może
 * w swojej formule odwołać się tylko do zmiennych z answers/settings albo do wyniku reguły
 * zadeklarowanej WCZEŚNIEJ w tej samej liście (pod nazwą ostatniego segmentu jej klucza).
 */

import { evaluateFormula, type FormulaScope } from "@/lib/calculator/formula";
import {
  isConditionalPrice,
  scopeVariableName,
  type CalculatorRule,
  type CalculatorRuleCategory,
  type QuantitySource,
  type RulePrice,
} from "@/lib/calculator/rules-types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveQuantity(source: QuantitySource, scope: FormulaScope): number {
  switch (source.type) {
    case "fixed":
      return source.value;
    case "field":
      return scope[source.field] ?? 0;
    case "formula":
      return evaluateFormula(source.expression, scope);
  }
}

function resolvePrice(price: RulePrice, scope: FormulaScope): number {
  if (isConditionalPrice(price)) {
    return scope[price.ifField] ? price.whenTrue : price.whenFalse;
  }
  return price;
}

function evaluateRuleAmount(rule: CalculatorRule, scope: FormulaScope): number {
  switch (rule.kind) {
    case "flat":
      return rule.amount;
    case "tiered": {
      const value = resolveQuantity(rule.input, scope);
      for (const tier of rule.tiers) {
        if (tier.upTo === null || value <= tier.upTo) {
          return tier.amount;
        }
      }
      return rule.tiers.length > 0 ? rule.tiers[rule.tiers.length - 1].amount : 0;
    }
    case "quantity":
      return resolveQuantity(rule.quantity, scope) * resolvePrice(rule.unitPrice, scope);
    case "bom": {
      const linesTotal = rule.lines.reduce(
        (sum, line) => sum + resolveQuantity(line.quantity, scope) * line.unitPrice,
        0,
      );
      const laborTotal = rule.labor ? resolveQuantity(rule.labor.hours, scope) * rule.labor.ratePerHour : 0;
      return linesTotal + laborTotal;
    }
    case "formula":
      return evaluateFormula(rule.expression, scope);
  }
}

export type RuleEvaluationResult = {
  /**
   * Wartość każdej reguły pod jej kluczem — dla reguł BEZ roundingGroup (albo pomocniczych) to
   * dokładnie to, co wchodzi do sumy. Dla reguł WEWNĄTRZ wspólnej grupy zaokrąglenia to wartość
   * zaokrąglona osobno (do podglądu/edycji), ale suma tej grupy w totalsByCategory liczona jest z
   * wartości SUROWYCH (nieszaokrąglonych) każdej reguły z grupy, zaokrąglonych RAZEM na końcu —
   * dokładnie jak w źródłowym arkuszu (patrz `roundingGroup` w rules-types.ts).
   */
  valuesByKey: Record<string, number>;
  totalsByCategory: Record<CalculatorRuleCategory, number>;
  total: number;
};

/**
 * Liczy cały zestaw reguł na podanym scope startowym (zbudowanym z answers+settings — patrz
 * `buildBazaScope` niżej dla przykładu kategorii "baza"). Reguły pomocnicze (contributesToTotal =
 * false) NIE są zaokrąglane przed wpisaniem do scope kolejnych reguł — pełna precyzja przechodzi
 * dalej, tak jak w arkuszu kalkulacyjnym (zaokrąglenie dopiero na widocznych pozycjach oferty).
 */
export function evaluateRules(rules: CalculatorRule[], initialScope: FormulaScope): RuleEvaluationResult {
  const scope: FormulaScope = { ...initialScope };
  const valuesByKey: Record<string, number> = {};
  const totalsByCategory = {} as Record<CalculatorRuleCategory, number>;
  /** Surowa (nieszaokrąglona) suma per (kategoria, roundingGroup) — zaokrąglana raz na końcu danej grupy. */
  const rawGroupSums = new Map<string, number>();

  function groupKey(rule: CalculatorRule): string {
    return `${rule.category}::${rule.roundingGroup}`;
  }

  for (const rule of rules) {
    const gateOpen = rule.gate ? Boolean(scope[rule.gate]) : true;
    let rawValue = gateOpen ? evaluateRuleAmount(rule, scope) : 0;

    if (gateOpen) {
      for (const multiplierName of rule.postMultipliers) {
        const raw = scope[multiplierName];
        const coefficient = Math.max(0, raw || 1);
        rawValue *= coefficient;
      }
    }

    // Scope zawsze dostaje pełną precyzję (nieszaokrągloną) — dalsze formuły liczą dokładnie.
    scope[scopeVariableName(rule.key)] = rawValue;

    if (!rule.contributesToTotal) {
      valuesByKey[rule.key] = rawValue;
      continue;
    }

    valuesByKey[rule.key] = roundMoney(rawValue);

    if (rule.roundingGroup === null) {
      totalsByCategory[rule.category] = roundMoney((totalsByCategory[rule.category] ?? 0) + rawValue);
    } else {
      const key = groupKey(rule);
      rawGroupSums.set(key, (rawGroupSums.get(key) ?? 0) + rawValue);
    }
  }

  for (const [key, rawSum] of rawGroupSums) {
    const category = key.split("::")[0] as CalculatorRuleCategory;
    totalsByCategory[category] = roundMoney((totalsByCategory[category] ?? 0) + roundMoney(rawSum));
  }

  const total = roundMoney(Object.values(totalsByCategory).reduce((sum, v) => sum + v, 0));
  return { valuesByKey, totalsByCategory, total };
}

/** Scope dla kategorii "Baza systemu" — pola ankiety i stałe z ustawień, które reguły baza.* mogą nazwać po imieniu. */
export function buildBazaScope(
  answers: import("@/lib/calculator/types").CalculatorAnswers,
  settings: import("@/lib/calculator/settings").CalculatorSettings,
): FormulaScope {
  const b = settings.bazaZasilania;
  const r = settings.rozdzielnia;
  const s = settings.baseSystem;

  return {
    // -- odpowiedzi ankiety (bool -> 0/1) --
    liczbaKondygnacji: answers.liczbaKondygnacji,
    powierzchniaM2: answers.powierzchniaM2,
    wspolczynnikProjekt: answers.wspolczynnikProjekt,
    wspolczynnikRozdzielnica: answers.wspolczynnikRozdzielnica,
    trudnyKlientWspolczynnik: answers.trudnyKlientWspolczynnik,
    strefaPrywatna: answers.strefaPrywatna ? 1 : 0,
    strefaOtwarta: answers.strefaOtwarta ? 1 : 0,
    komunikacja: answers.komunikacja ? 1 : 0,
    liczbaSypialniDodatkowych: answers.liczbaSypialniDodatkowych,
    liczbaPomieszczenWilgotnych: answers.liczbaPomieszczenWilgotnych,
    liczbaPozostalychPomieszczen: answers.liczbaPozostalychPomieszczen,
    iloscGarazy: answers.iloscGarazy,
    korzystamZArchitekta: answers.korzystamZArchitekta ? 1 : 0,
    liczbaRolet: answers.liczbaRolet,
    liczbaOkienOtwieranych: answers.liczbaOkienOtwieranych,
    instalacjaDoTelewizjiLubLan: answers.instalacjaDoTelewizjiLubLan ? 1 : 0,
    instalacjaDoGlosnikow: answers.instalacjaDoGlosnikow ? 1 : 0,
    instalacjaDoMonitoringu: answers.instalacjaDoMonitoringu ? 1 : 0,
    iloscKamerMonitoringu: answers.iloscKamerMonitoringu,
    strefyOgrzewaniaPodlogowego: answers.strefyOgrzewaniaPodlogowego,
    sterowanieOgrodem: answers.sterowanieOgrodem ? 1 : 0,
    iloscOswietlenZewnetrznych: answers.iloscOswietlenZewnetrznych,
    iloscSekcjiPodlewania: answers.iloscSekcjiPodlewania,
    rozszerzenieKnx: answers.rozszerzenieKnx ? 1 : 0,
    tylkoRozdzielnia: answers.tylkoRozdzielnia ? 1 : 0,
    ledySciemniane: answers.ledySciemniane,
    dodatkowyZasilaczUps: answers.addons.dodatkowyZasilaczUps ? 1 : 0,
    alarmIKontrolaDostepu: answers.alarmIKontrolaDostepu ? 1 : 0,
    sterowanieTemperatura: answers.sterowanieTemperatura ? 1 : 0,
    planujeRolety: answers.planujeRolety ? 1 : 0,
    scenyOswietleniowe: answers.scenyOswietleniowe ? 1 : 0,
    czujnikiOtwarciaOkien: answers.addons.czujnikiOtwarciaOkien ? 1 : 0,
    odlegloscKm: answers.odlegloscKm,

    // -- ustawienia (edytowalne w panelu) --
    projektJednaKondygnacja: s.projektJednaKondygnacja,
    projektWieleKondygnacji: s.projektWieleKondygnacji,
    projektDuzyDomProgM2: s.projektDuzyDomProgM2,
    projektDuzyDomDoplata: s.projektDuzyDomDoplata,
    sprzetJednaKondygnacja: r.sprzetJednaKondygnacja,
    sprzetWieleKondygnacji: r.sprzetWieleKondygnacji,
    wzrostCenProcent: r.wzrostCenProcent,
    progPunktowNiski: r.progPunktowNiski,
    progPunktowWysoki: r.progPunktowWysoki,
    cenaPonizejProguNiskiego: r.cenaPonizejProguNiskiego,
    cenaPonizejProguWysokiego: r.cenaPonizejProguWysokiego,
    cenaPowyzejProguWysokiego: r.cenaPowyzejProguWysokiego,
    podstawoweWyposazeniePunkty: r.podstawoweWyposazeniePunkty,
    automatykaPodstawaStandard: b.automatykaPodstawaStandard,
    automatykaPodstawaKnx: b.automatykaPodstawaKnx,
    tylkoRozdzielniaSprzet: b.tylkoRozdzielniaSprzet,
    zasilaczeLedZaModulRgbw: b.zasilaczeLedZaModulRgbw,
    zasilaczeLedUpsRoletyDoplata: b.zasilaczeLedUpsRoletyDoplata,
    zasilanieBuforoweRezerwowe: b.zasilanieBuforoweRezerwowe,
    zasilanieKnxDoplata: b.zasilanieKnxDoplata,
    linkiMaterialyJednaKondygnacja: b.linkiMaterialyJednaKondygnacja,
    linkiMaterialyWieleKondygnacji: b.linkiMaterialyWieleKondygnacji,
    oznaczniki: b.oznaczniki,
    logistykaPaliwoZaKm: b.logistykaPaliwoZaKm,
    logistykaGodzinowaZaKm: b.logistykaGodzinowaZaKm,
    logistykaProgDietyKm: b.logistykaProgDietyKm,
    logistykaDietaStawka: b.logistykaDietaStawka,
    logistykaProgNoclegowKm: b.logistykaProgNoclegowKm,
    logistykaNoclegStawka: b.logistykaNoclegStawka,
    logistykaStalaOplata: b.logistykaStalaOplata,
  };
}
