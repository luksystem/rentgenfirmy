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
  isFormulaPrice,
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
  if (isFormulaPrice(price)) {
    return evaluateFormula(price.formula, scope);
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
        (sum, line) => sum + resolveQuantity(line.quantity, scope) * resolvePrice(line.unitPrice, scope),
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
 * `buildScope` niżej). Reguły pomocnicze (contributesToTotal =
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

    const roundedValue = roundMoney(rawValue);
    valuesByKey[rule.key] = roundedValue;

    if (rule.roundingGroup === null) {
      // Reguła bez grupy zaokrągla się NIEZALEŻNIE, a do sumy kategorii wchodzi już zaokrąglona
      // wartość (dokładnie jak w źródle: calculateFunctionalBudgets zaokrągla KAŻDĄ kategorię z
      // osobna, a dopiero wywołujący sumuje te już-zaokrąglone wartości).
      totalsByCategory[rule.category] = roundMoney((totalsByCategory[rule.category] ?? 0) + roundedValue);
      // Suma kategorii "do tej pory" pod stałą nazwą — pozwala kolejnej regule w tej samej
      // kategorii (np. rabat proporcjonalny na końcu) odwołać się do JUŻ ZAOKRĄGLONEJ sumy
      // poprzednich pozycji, bez ręcznego powtarzania ich formuł (patrz "inne_systemy.rabat...").
      scope[`total_${rule.category}`] = totalsByCategory[rule.category];
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

/**
 * Pola ankiety `number | null` (ręczna ilość, null = licz automatycznie) nie mają odpowiednika w
 * FormulaScope (tylko liczby) — rozbite na dwie zmienne: `<name>Manual` (0/1, czy podano ręcznie)
 * i `<name>Value` (podana wartość, 0 gdy nie podano). Formuła sama decyduje: IF(xManual;xValue;auto).
 */
function manualFields(name: string, value: number | null): FormulaScope {
  return {
    [`${name}Manual`]: value === null ? 0 : 1,
    [`${name}Value`]: value ?? 0,
  };
}

/**
 * Scope wspólny dla wszystkich kategorii reguł — pola ankiety i stałe z ustawień, które dowolna
 * reguła może nazwać po imieniu w swojej formule. Rośnie wraz z kolejnymi migrowanymi kategoriami
 * (na razie: baza, funkcjonalne). Pomocnicze wartości pośrednie (np. rgbwModuleQty,
 * obwodyOswietleniaOnOff) są liczone RAZ jako reguły pomocnicze i współdzielone między kategoriami
 * — dokładnie jak w engine.ts, gdzie te same funkcje pomocnicze zasilają kilka miejsc naraz.
 */
export function buildScope(
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
    satelWOptimum: answers.satelWOptimum ? 1 : 0,
    czyCzujkiRecznie: answers.czyCzujkiRecznie ? 1 : 0,
    iloscCzujekLoxone: answers.iloscCzujekLoxone,
    liczbaPomieszczenZOknami: answers.liczbaPomieszczenZOknami,
    iloscCzujekSatel: answers.iloscCzujekSatel,
    iloscCzujekBezpieczenstwa: answers.iloscCzujekBezpieczenstwa,
    jestKominek: answers.jestKominek ? 1 : 0,
    jestGaz: answers.jestGaz ? 1 : 0,
    liczbaDrzwiWejsciowych: answers.liczbaDrzwiWejsciowych,
    liczbaWyjscNaTaras: answers.liczbaWyjscNaTaras,
    czyOknaCzujnikiFabryczne: answers.czyOknaCzujnikiFabryczne ? 1 : 0,
    iloscGrzejnikowSterowanych: answers.iloscGrzejnikowSterowanych,
    wspolczynnikOutdoor: answers.wspolczynnikOutdoor,
    iloscPrzyciskowPrestiz: answers.iloscPrzyciskowPrestiz,
    kanalyPrzepustyDoTv: answers.kanalyPrzepustyDoTv ? 1 : 0,
    instalacjaMasztuAnteny: answers.instalacjaMasztuAnteny ? 1 : 0,
    rozdzielniaBudowlana: answers.rozdzielniaBudowlana ? 1 : 0,
    przylaczeDoDomu: answers.przylaczeDoDomu ? 1 : 0,
    dlugoscPrzylaczaM: answers.dlugoscPrzylaczaM,
    formalnosciOdbiorowe: answers.formalnosciOdbiorowe ? 1 : 0,
    pomiaryWewnetrzne: answers.pomiaryWewnetrzne ? 1 : 0,
    dodatkoweBruzdowanieM: answers.dodatkoweBruzdowanieM,
    kompleksowaInstalacja: answers.kompleksowaInstalacja ? 1 : 0,
    iloscElektrozaczepow: answers.iloscElektrozaczepow,
    iloscKlawiaturNfc: answers.iloscKlawiaturNfc,
    iloscOswSciemniane: answers.iloscOswSciemniane,
    platneIntegracjeZInnymiSystemami: answers.platneIntegracjeZInnymiSystemami ? 1 : 0,
    integracjaKlimatyzacja: answers.integracjaKlimatyzacja ? 1 : 0,
    integracjaWentylacja: answers.integracjaWentylacja ? 1 : 0,
    integracjaRekuperacja: answers.integracjaRekuperacja ? 1 : 0,
    integracjaPompaCiepla: answers.integracjaPompaCiepla ? 1 : 0,
    addon_stacjaPogodowa: answers.addons.stacjaPogodowa ? 1 : 0,
    addon_oswietlenieSciemniane230V: answers.addons.oswietlenieSciemniane230V ? 1 : 0,
    addon_oswietlenieKoloroweRGBW: answers.addons.oswietlenieKoloroweRGBW ? 1 : 0,
    addon_czujnikiOtwarciaOkien: answers.addons.czujnikiOtwarciaOkien ? 1 : 0,
    addon_klawiaturyNfc: answers.addons.klawiaturyNfc ? 1 : 0,
    addon_przygotowanieDostepuDrzwi: answers.addons.przygotowanieDostepuDrzwi ? 1 : 0,
    addon_bezpieczenstwoPlusPlusPlus: answers.addons.bezpieczenstwoPlusPlusPlus ? 1 : 0,
    addon_sterowaneGniazda: answers.addons.sterowaneGniazda ? 1 : 0,
    addon_dodatkowyLicznikPradu: answers.addons.dodatkowyLicznikPradu ? 1 : 0,
    addon_dodatkowyZasilaczUps: answers.addons.dodatkowyZasilaczUps ? 1 : 0,
    addon_rozdzielniaPlusPlusPlus: answers.addons.rozdzielniaPlusPlusPlus ? 1 : 0,
    addon_budzikInteligentny: answers.addons.budzikInteligentny ? 1 : 0,
    addon_przyciskUkryty: answers.addons.przyciskUkryty ? 1 : 0,
    addon_stacjaDokujacaIpad: answers.addons.stacjaDokujacaIpad ? 1 : 0,
    addon_ipad: answers.addons.ipad ? 1 : 0,
    addon_oswietlenieAwaryjne: answers.addons.oswietlenieAwaryjne ? 1 : 0,
    addon_integracjeZInnymiSystemami: answers.addons.integracjeZInnymiSystemami ? 1 : 0,
    addon_dokumentacjaPowykonawcza: answers.addons.dokumentacjaPowykonawcza ? 1 : 0,
    addon_ustaleniaZInnymiBranzami: answers.addons.ustaleniaZInnymiBranzami ? 1 : 0,
    addon_konsultacjeZdalne24_7: answers.addons.konsultacjeZdalne24_7 ? 1 : 0,
    addon_przedluzenieGwarancji12Miesiecy: answers.addons.przedluzenieGwarancji12Miesiecy ? 1 : 0,
    addon_gwarancjaCenyOfertowej: answers.addons.gwarancjaCenyOfertowej ? 1 : 0,
    otherSystems_sieciLan: answers.otherSystems.sieciLan ? 1 : 0,
    otherSystems_telewizja: answers.otherSystems.telewizja ? 1 : 0,
    otherSystems_wideodomofon: answers.otherSystems.wideodomofon ? 1 : 0,
    otherSystems_monitoring: answers.otherSystems.monitoring ? 1 : 0,
    otherSystems_naglosnienie: answers.otherSystems.naglosnienie ? 1 : 0,
    otherSystems_multiroom: answers.otherSystems.multiroom ? 1 : 0,
    otherSystems_sauna: answers.otherSystems.sauna ? 1 : 0,
    otherSystems_alarmTymczasowy: answers.otherSystems.alarmTymczasowy ? 1 : 0,
    szafkaRackLan: answers.szafkaRackLan ? 1 : 0,
    iloscAP: answers.iloscAP,
    multiswitchTv: answers.multiswitchTv ? 1 : 0,
    szafaRackTv: answers.szafaRackTv ? 1 : 0,
    loxoneDoplataWideodomofon: answers.loxoneDoplataWideodomofon ? 1 : 0,
    monitoringRejestrator: answers.monitoringRejestrator ? 1 : 0,
    monitoring8Mpx: answers.monitoring8Mpx ? 1 : 0,
    glosnikWcNaglosnienie: answers.glosnikWcNaglosnienie ? 1 : 0,
    iloscStrefMultiroom: answers.iloscStrefMultiroom,
    iloscGlosnikowMultiroom: answers.iloscGlosnikowMultiroom,
    iloscSkrzynekMultiroom: answers.iloscSkrzynekMultiroom,
    wspolczynnikAlarmTymczasowy: answers.wspolczynnikAlarmTymczasowy,
    inneSystemyMaxPercent: settings.discounts.inneSystemyMaxPercent,
    ...manualFields("iloscObwodowGniazd230V", answers.iloscObwodowGniazd230V),
    ...manualFields("iloscKolejnychGniazdObwody230V", answers.iloscKolejnychGniazdObwody230V),
    ...manualFields("iloscGniazd400V", answers.iloscGniazd400V),
    ...manualFields("iloscObwodowOswietleniaWszystkich", answers.iloscObwodowOswietleniaWszystkich),
    ...manualFields("iloscOswietleniaKolejne", answers.iloscOswietleniaKolejne),
    ...manualFields("iloscGniazdLanTv", answers.iloscGniazdLanTv),
    ...manualFields("iloscKabliGlosnikowych", answers.iloscKabliGlosnikowych),
    ...manualFields("iloscKanalowTv", answers.iloscKanalowTv),
    ...manualFields("iloscPrzyciskowNormal", answers.iloscPrzyciskowNormal),

    // -- ustawienia (edytowalne w panelu) --
    laborRatePerHour: settings.laborRatePerHour,
    stawkaStandardBaza: settings.electrical.rates.standard,
    stawkaInteligentnyBaza: settings.electrical.rates.inteligentny,
    stawkaGotoweUrzadzenieBaza: settings.electrical.rates.gotowe_urzadzenie,
    stawkaPetlaBaza: settings.electrical.rates.petla,
    referencyjnyDystansKm: settings.electrical.referencyjnyDystansKm,
    doplataZaKmNettoNaPunkt: settings.electrical.doplataZaKmNettoNaPunkt,
    kanalTv: settings.electrical.fixed.kanalTv,
    antenaZMasztem: settings.electrical.fixed.antenaZMasztem,
    dzierzawaRozdzielniBudowlanej: settings.electrical.fixed.dzierzawaRozdzielniBudowlanej,
    obsadzenieRozdzielniGlownej: settings.electrical.fixed.obsadzenieRozdzielniGlownej,
    przylaczeZaMetr: settings.electrical.fixed.przylaczeZaMetr,
    formalnosciOdbioroweCena: settings.electrical.fixed.formalnosciOdbiorowe,
    pomiaryWewnetrzneZaPunkt: settings.electrical.fixed.pomiaryWewnetrzneZaPunkt,
    dodatkoweBruzdowanieZaMetr: settings.electrical.fixed.dodatkoweBruzdowanieZaMetr,
    podstawoweWyposazenieInstalacji: settings.electrical.fixed.podstawoweWyposazenieInstalacji,
    doplataZaBrameGarazowa: settings.electrical.fixed.doplataZaBrameGarazowa,
    cenaPrzyciskuPrestiz: settings.extras.cenaPrzyciskuPrestiz,
    cenaPrzyciskuNormal: settings.extras.cenaPrzyciskuNormal,
    instalacjaKompleksowaPercent: settings.discounts.instalacjaKompleksowaPercent,
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
