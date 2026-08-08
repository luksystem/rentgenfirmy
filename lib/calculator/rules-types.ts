/**
 * Model reguł cennika, edytowalnych w aplikacji (Ustawienia -> Kalkulator -> Reguły), zamiast na
 * sztywno w engine.ts. Zastępuje hardcodowaną logikę — nie tylko liczby (to już robi settings.ts),
 * ale też SAM KSZTAŁT formuły (progi, warunki, listy pozycji).
 *
 * Podejście hybrydowe: większość reguł to proste, ustrukturyzowane kształty (flat/tiered/quantity/
 * bom) edytowalne przez zwykły formularz — bez pisania formuł. Tylko naprawdę złożone przypadki
 * (logistyka WYJAZDY, punkty elektryczne) używają kind="formula" z tekstową formułą (formula.ts)
 * jako "wyjściem awaryjnym".
 *
 * Każda reguła odpowiada jednej pozycji z katalogu silnika (lib/calculator/engine.ts) — key
 * pokrywa się z tym, co dziś jest tytułem pozycji w katalogu wizualnym kalkulatora.
 */

export const CALCULATOR_RULE_CATEGORIES = [
  "baza",
  "funkcjonalne",
  "elektryka",
  "dodatki",
  "inne_systemy",
  "rabaty",
] as const;
export type CalculatorRuleCategory = (typeof CALCULATOR_RULE_CATEGORIES)[number];

/** Cena warunkowa — prosty "warunek" dopuszczalny bez pisania formuły (np. czujnik: fabryczny/standard). */
export type ConditionalPrice = {
  ifField: string;
  whenTrue: number;
  whenFalse: number;
};

/** Cena liczona formułą — dla pozycji, których stawka zależy od czegoś więcej niż jednego warunku (np. stawka punktu elektrycznego + dopłata za km). */
export type FormulaPrice = { formula: string };

export type RulePrice = number | ConditionalPrice | FormulaPrice;

export function isConditionalPrice(price: RulePrice): price is ConditionalPrice {
  return typeof price === "object" && price !== null && "ifField" in price;
}

export function isFormulaPrice(price: RulePrice): price is FormulaPrice {
  return typeof price === "object" && price !== null && "formula" in price;
}

/** Źródło ilości — wprost pole ankiety, stała liczba, albo (rzadko) formuła tekstowa. */
export type QuantitySource =
  | { type: "fixed"; value: number }
  | { type: "field"; field: string }
  | { type: "formula"; expression: string };

export type RuleTier = {
  /** Górna granica progu (włącznie z niższymi wartościami); null = "i więcej" (ostatni próg). */
  upTo: number | null;
  amount: number;
};

export type BomLine = {
  id: string;
  label: string;
  quantity: QuantitySource;
  unitPrice: RulePrice;
};

type RuleBase = {
  key: string;
  category: CalculatorRuleCategory;
  label: string;
  /** Pole ankiety (boolean), które musi być prawdziwe, żeby reguła się liczyła. null = zawsze aktywna. */
  gate: string | null;
  /**
   * Nazwy zmiennych, które (w kolejności) mnożą wynik PO policzeniu bazy — np. trudny klient,
   * współczynnik projektu/rozdzielnicy/outdoor. Pusta lista = brak mnożnika. Większość reguł ma co
   * najwyżej 1 element; kategoria "zewnętrzne" ma 2 naraz (trudny klient × outdoor).
   */
  postMultipliers: string[];
  /** Notatka redakcyjna widoczna w edytorze — np. "uproszczenie: ..." albo "niezweryfikowane empirycznie". */
  notes: string | null;
  /**
   * false = reguła pomocnicza (np. "liczba punktów elektrycznych") — jej wynik trafia do scope pod
   * nazwą ostatniego segmentu klucza (patrz `scopeVariableName`) i mogą go użyć kolejne reguły w
   * formułach, ale sama NIE wchodzi do sumy kategorii. Domyślnie true.
   */
  contributesToTotal: boolean;
  /**
   * Reguły z tym samym roundingGroup są sumowane BEZ zaokrąglania każdej z osobna, a dopiero suma
   * grupy jest zaokrąglana raz — dokładnie tak jak w źródle (np. 6 składowych "baza zasilania"
   * sumuje się bez zaokrągleń pośrednich, dopiero cały sterownik+zasilanie+konfiguracja+logistyka
   * zaokrągla się na końcu). null = reguła sama jest swoim własnym punktem zaokrąglenia (liczona i
   * zaokrąglana niezależnie od innych, jak "Projekt" czy "Wykonanie rozdzielni").
   */
  roundingGroup: string | null;
};

/** Nazwa zmiennej, pod jaką wynik reguły trafia do scope formuł — ostatni segment klucza ("baza.punktyElektryczne" -> "punktyElektryczne"). */
export function scopeVariableName(key: string): string {
  const parts = key.split(".");
  return parts[parts.length - 1];
}

export type FlatRule = RuleBase & {
  kind: "flat";
  amount: number;
};

export type TieredRule = RuleBase & {
  kind: "tiered";
  /** Zmienna (pole ankiety) lub prosta formuła dająca wartość porównywaną z progami. */
  input: QuantitySource;
  tiers: RuleTier[];
};

export type QuantityRule = RuleBase & {
  kind: "quantity";
  quantity: QuantitySource;
  unitPrice: RulePrice;
};

export type BomRule = RuleBase & {
  kind: "bom";
  lines: BomLine[];
  /** Opcjonalna robocizna doliczana do sumy pozycji: godziny (formuła/pole) × stawka za h. */
  labor: { hours: QuantitySource; ratePerHour: number } | null;
};

export type FormulaRule = RuleBase & {
  kind: "formula";
  expression: string;
};

export type CalculatorRule = FlatRule | TieredRule | QuantityRule | BomRule | FormulaRule;

export function emptyBomLine(id: string): BomLine {
  return { id, label: "Nowa pozycja", quantity: { type: "fixed", value: 1 }, unitPrice: 0 };
}

const RULE_DEFAULTS = {
  gate: null,
  postMultipliers: [] as string[],
  notes: null,
  contributesToTotal: true,
  roundingGroup: null,
};

function formulaRule(
  partial: Pick<FormulaRule, "key" | "category" | "label" | "expression"> & Partial<FormulaRule>,
): FormulaRule {
  return { ...RULE_DEFAULTS, kind: "formula", ...partial };
}

function tieredRule(
  partial: Pick<TieredRule, "key" | "category" | "label" | "input" | "tiers"> & Partial<TieredRule>,
): TieredRule {
  return { ...RULE_DEFAULTS, kind: "tiered", ...partial };
}

function bomRule(
  partial: Pick<BomRule, "key" | "category" | "label" | "lines"> & Partial<BomRule>,
): BomRule {
  return { ...RULE_DEFAULTS, kind: "bom", labor: null, ...partial };
}

function quantityRule(
  partial: Pick<QuantityRule, "key" | "category" | "label" | "quantity" | "unitPrice"> & Partial<QuantityRule>,
): QuantityRule {
  return { ...RULE_DEFAULTS, kind: "quantity", ...partial };
}

function fieldQty(field: string): QuantitySource {
  return { type: "field", field };
}

function formulaQty(expression: string): QuantitySource {
  return { type: "formula", expression };
}

function fixedQty(value: number): QuantitySource {
  return { type: "fixed", value };
}

let bomLineCounter = 0;
function line(label: string, quantity: QuantitySource, unitPrice: RulePrice): BomLine {
  bomLineCounter += 1;
  return { id: `bl-${bomLineCounter}`, label, quantity, unitPrice };
}

/**
 * Reguły kategorii "Baza systemu" — 1:1 odtworzenie calculateBaseSystem/calculateBazaZasilania
 * z engine.ts (patrz komentarze źródłowe tam: DANE!T109:T111). Kolejność ma znaczenie: reguły
 * pomocnicze (contributesToTotal=false) muszą być zadeklarowane PRZED regułami, które się do nich
 * odwołują w formule (silnik liczy od góry do dołu, jak w arkuszu kalkulacyjnym).
 */
export const DEFAULT_CALCULATOR_RULES: CalculatorRule[] = [
  // --- pomocnicze (nie wliczają się same w sobie do sumy, tylko udostępniają wartość formułom niżej) ---
  formulaRule({
    key: "baza.obwodyOswietleniaOnOff",
    category: "baza",
    label: "Obwody oświetlenia ON/OFF (pomocnicza)",
    contributesToTotal: false,
    notes: "Współdzielona z kategorią funkcjonalną Oświetlenie (przekaźniki Loxone).",
    expression:
      "IF(strefaPrywatna;4;0)+IF(strefaOtwarta;6;0)+IF(komunikacja;2;0)+liczbaSypialniDodatkowych*2+liczbaPomieszczenWilgotnych+liczbaPozostalychPomieszczen*2+iloscGarazy*2",
  }),
  formulaRule({
    key: "baza.oswietleniePunkty",
    category: "baza",
    label: "Punkty oświetlenia — obwody ON/OFF + ściemniane LED 24V (pomocnicza)",
    contributesToTotal: false,
    expression:
      "obwodyOswietleniaOnOff" +
      "+(IF(strefaPrywatna;2;0)+IF(strefaOtwarta;4;0)+IF(komunikacja;2;0)+liczbaSypialniDodatkowych+liczbaPomieszczenWilgotnych)",
  }),
  formulaRule({
    key: "baza.punktyElektryczne",
    category: "baza",
    label: "Liczba punktów elektrycznych (pomocnicza)",
    contributesToTotal: false,
    notes:
      "Decyduje o progu ceny wykonania rozdzielni. Blok „podstawowe wyposażenie” przybliżony stałą punktową (podstawoweWyposazeniePunkty), nie w pełni odtworzony ze zdublowanego arkusza źródłowego.",
    expression:
      "(IF(strefaPrywatna;2;0)+IF(strefaOtwarta;4;0)+IF(komunikacja;1;0)+liczbaSypialniDodatkowych+liczbaPomieszczenWilgotnych+liczbaPozostalychPomieszczen+iloscGarazy)" +
      "+(IF(strefaPrywatna;6;0)+IF(strefaOtwarta;8;0)+IF(komunikacja;3;0)+liczbaSypialniDodatkowych*3+liczbaPomieszczenWilgotnych+liczbaPozostalychPomieszczen+iloscGarazy*6)" +
      "+(IF(strefaOtwarta;1;0)+iloscGarazy)" +
      "+oswietleniePunkty+oswietleniePunkty*IF(korzystamZArchitekta;1.5;0.5)" +
      "+liczbaRolet" +
      "+(podstawoweWyposazeniePunkty+1+liczbaOkienOtwieranych+1)" +
      "+IF(instalacjaDoTelewizjiLubLan;(IF(strefaPrywatna;2;0)+IF(strefaOtwarta;2;0)+liczbaSypialniDodatkowych+5);0)" +
      "+IF(instalacjaDoGlosnikow;(IF(strefaOtwarta;5;0)+IF(strefaPrywatna;2;0)+liczbaSypialniDodatkowych+liczbaPozostalychPomieszczen);0)" +
      "+IF(instalacjaDoMonitoringu;iloscKamerMonitoringu;0)" +
      "+ROUNDUP(strefyOgrzewaniaPodlogowego/5;0)" +
      "+IF(sterowanieOgrodem;((iloscOswietlenZewnetrznych+iloscSekcjiPodlewania)+(iloscOswietlenZewnetrznych+iloscSekcjiPodlewania)/2+1);0)",
  }),
  formulaRule({
    key: "baza.rgbwModuleQty",
    category: "baza",
    label: "Ilość modułów RGBW (pomocnicza)",
    contributesToTotal: false,
    notes: "Współdzielona z kategorią funkcjonalną Oświetlenie (ta sama ilość, ZESTAWIENIE!L10).",
    expression: "IF(ledySciemniane>0;ROUNDUP(ledySciemniane/4;0);liczbaSypialniDodatkowych*2)",
  }),
  formulaRule({
    key: "baza.dystans",
    category: "baza",
    label: "Odległość liczona do logistyki (pomocnicza)",
    contributesToTotal: false,
    expression: "MAX(0;odlegloscKm)",
  }),
  formulaRule({
    key: "baza.paliwo",
    category: "baza",
    label: "Logistyka — paliwo (pomocnicza)",
    contributesToTotal: false,
    expression: "dystans*logistykaPaliwoZaKm",
  }),
  formulaRule({
    key: "baza.godzinyDojazdu",
    category: "baza",
    label: "Logistyka — koszt godzin dojazdu (pomocnicza)",
    contributesToTotal: false,
    expression: "dystans*logistykaGodzinowaZaKm",
  }),
  formulaRule({
    key: "baza.liczbaWybranychFunkcjonalnosci",
    category: "baza",
    label: "Liczba wybranych kategorii funkcjonalnych (pomocnicza)",
    contributesToTotal: false,
    notes: "Alarm, temperatura, rolety, ogród, sceny oświetleniowe — te same wyjazdy montażowe co pozostała instalacja.",
    expression:
      "IF(alarmIKontrolaDostepu;1;0)+IF(sterowanieTemperatura;1;0)+IF(planujeRolety;1;0)+IF(sterowanieOgrodem;1;0)+IF(scenyOswietleniowe;1;0)",
  }),
  formulaRule({
    key: "baza.czujnikiOtwarciaWyjazd",
    category: "baza",
    label: "Dodatek „czujniki otwarcia okien” jako wyjazd (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(czujnikiOtwarciaOkien;1;0)",
  }),
  formulaRule({
    key: "baza.sumaOsobodni",
    category: "baza",
    label: "Suma osobodni wyjazdów — diety (pomocnicza)",
    contributesToTotal: false,
    expression: "1+3*czujnikiOtwarciaWyjazd+1+3*liczbaWybranychFunkcjonalnosci+6+2+1",
  }),
  formulaRule({
    key: "baza.dieta",
    category: "baza",
    label: "Logistyka — diety, aktywne powyżej progu km (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(dystans>logistykaProgDietyKm;logistykaDietaStawka*sumaOsobodni;0)",
  }),
  formulaRule({
    key: "baza.sumaOsobodniMinusDzien",
    category: "baza",
    label: "Suma osobodni wyjazdów — noclegi (pomocnicza)",
    contributesToTotal: false,
    expression: "3*(czujnikiOtwarciaWyjazd-1)+3*(liczbaWybranychFunkcjonalnosci-1)+3",
  }),
  formulaRule({
    key: "baza.nocleg",
    category: "baza",
    label: "Logistyka — noclegi, aktywne powyżej progu km (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(dystans>logistykaProgNoclegowKm;logistykaNoclegStawka*sumaOsobodniMinusDzien;0)",
  }),

  // --- pozycje wliczane do oferty ---
  formulaRule({
    key: "baza.projekt",
    category: "baza",
    label: "Projekt Inteligentnego Domu",
    postMultipliers: ["wspolczynnikProjekt"],
    expression: "IF(liczbaKondygnacji>1;projektWieleKondygnacji;projektJednaKondygnacja)+IF(powierzchniaM2>=projektDuzyDomProgM2;projektDuzyDomDoplata;0)",
  }),
  formulaRule({
    key: "baza.rozdzielniaWykonanie",
    category: "baza",
    label: "Wykonanie rozdzielni",
    postMultipliers: ["wspolczynnikRozdzielnica"],
    expression:
      "(IF(liczbaKondygnacji>1;sprzetWieleKondygnacji;sprzetJednaKondygnacja)*(1+wzrostCenProcent/100))" +
      "+IF(punktyElektryczne<progPunktowNiski;cenaPonizejProguNiskiego;IF(punktyElektryczne<progPunktowWysoki;cenaPonizejProguWysokiego;cenaPowyzejProguWysokiego))",
  }),
  tieredRule({
    key: "baza.wstepnaKonfiguracja",
    category: "baza",
    label: "Baza zasilania — wstępna konfiguracja",
    postMultipliers: ["wspolczynnikRozdzielnica"],
    roundingGroup: "bazaZasilania",
    input: { type: "field", field: "liczbaKondygnacji" },
    tiers: [
      { upTo: 1, amount: 2500 },
      { upTo: null, amount: 1500 },
    ],
  }),
  formulaRule({
    key: "baza.automatykaPodstawa",
    category: "baza",
    label: "Baza zasilania — automatyka podstawowa",
    roundingGroup: "bazaZasilania",
    expression: "IF(rozszerzenieKnx;automatykaPodstawaKnx;automatykaPodstawaStandard)+IF(tylkoRozdzielnia;tylkoRozdzielniaSprzet;0)",
    notes: "Wariant „tylko rozdzielnia” (+13300 zł) nie był obecny w żadnym z realnych przykładów użytych do weryfikacji — formuła odtworzona z arkusza, nie potwierdzona empirycznie.",
  }),
  formulaRule({
    key: "baza.zasilaczeLed",
    category: "baza",
    label: "Baza zasilania — zasilacze LED",
    roundingGroup: "bazaZasilania",
    expression: "rgbwModuleQty*zasilaczeLedZaModulRgbw+IF(dodatkowyZasilaczUps;zasilaczeLedUpsRoletyDoplata;0)",
    notes: "Zaokrąglana wyłącznie razem z pozostałymi składowymi bazy zasilania (grupa „bazaZasilania”), nie osobno — cena za moduł RGBW (700/3 zł) nie jest wartością równą co do grosza, a zaokrąglanie tej jednej pozycji z osobna dawało 1 grosz różnicy względem arkusza (znalezione i naprawione podczas migracji na reguły).",
  }),
  formulaRule({
    key: "baza.zasilanie",
    category: "baza",
    label: "Baza zasilania — zasilanie buforowe/rezerwowe",
    roundingGroup: "bazaZasilania",
    expression: "zasilanieBuforoweRezerwowe+IF(rozszerzenieKnx;zasilanieKnxDoplata;0)",
  }),
  formulaRule({
    key: "baza.linkiMaterialyOznaczniki",
    category: "baza",
    label: "Baza zasilania — linki, materiały, oznaczniki",
    roundingGroup: "bazaZasilania",
    expression: "IF(liczbaKondygnacji>1;linkiMaterialyWieleKondygnacji;linkiMaterialyJednaKondygnacja)+oznaczniki",
  }),
  formulaRule({
    key: "baza.logistyka",
    category: "baza",
    label: "Baza zasilania — logistyka (dojazd, diety, noclegi)",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    roundingGroup: "bazaZasilania",
    expression: "paliwo+dieta+nocleg+logistykaStalaOplata+godzinyDojazdu",
    notes:
      "Zweryfikowane co do grosza na 2 realnych przykładach z różną odległością: Dewódzki (90 km, KNX) = 15437,20 zł, Gorzelak (25 km, bez KNX) = 9483,92 zł (razem z pozostałymi pozycjami bazy zasilania powyżej).",
  }),

  // ==================================================================================
  // KATEGORIE FUNKCJONALNE — 1:1 odtworzenie calculateFunctionalBudgets z engine.ts.
  // Każda kategoria = lista materiałowa (BOM) + robocizna, × trudny klient (zewnętrzne
  // dodatkowo × współczynnik outdoor). Ceny sprzętu przeniesione literalnie z dawnego
  // CalculatorHardwareCatalog (settings.ts) — ta lista teraz JEST cennikiem, edytowalnym
  // wprost jako wiersze BOM, bez pośredniej tabeli w ustawieniach.
  // ==================================================================================
  formulaRule({
    key: "funkcjonalne.czujkaLoxoneQty",
    category: "funkcjonalne",
    label: "Ilość czujek Loxone — Oświetlenie (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(czyCzujkiRecznie;iloscCzujekLoxone;IF(satelWOptimum;0;MAX(0;liczbaPomieszczenZOknami-3)))",
  }),
  bomRule({
    key: "funkcjonalne.oswietlenie",
    category: "funkcjonalne",
    label: "Oświetlenie wewnętrzne",
    gate: "scenyOswietleniowe",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    lines: [
      line("Przekaźnik Loxone 14 kanałów", formulaQty("ROUNDUP(obwodyOswietleniaOnOff/16;0)"), 1584.7),
      line("Moduł RGBW", fieldQty("rgbwModuleQty"), 487.6),
      line("Czujka Loxone", fieldQty("czujkaLoxoneQty"), 487.6),
    ],
    labor: { hours: formulaQty("czujkaLoxoneQty*2"), ratePerHour: 120 },
  }),

  formulaRule({
    key: "funkcjonalne.bezpieczenstwoAktywne",
    category: "funkcjonalne",
    label: "Bezpieczeństwo aktywne (pomocnicza — zerowana przy „tylko rozdzielnia”)",
    contributesToTotal: false,
    expression: "AND(alarmIKontrolaDostepu;NOT(tylkoRozdzielnia))",
  }),
  formulaRule({
    key: "funkcjonalne.extensionDIQty",
    category: "funkcjonalne",
    label: "Ilość Extension DI (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(satelWOptimum;0;2)",
  }),
  formulaRule({
    key: "funkcjonalne.zaworQty",
    category: "funkcjonalne",
    label: "Ilość zaworów odcięcia wody (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(liczbaPomieszczenWilgotnych>0;1;0)",
  }),
  formulaRule({
    key: "funkcjonalne.satelSlaveQty",
    category: "funkcjonalne",
    label: "Ilość pozycji zależnych od SATEL — centrala/INT-KNX/klawiatury (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(satelWOptimum;1;0)",
  }),
  formulaRule({
    key: "funkcjonalne.czujkiSufitoweQty",
    category: "funkcjonalne",
    label: "Ilość czujek sufitowych (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(czyCzujkiRecznie;iloscCzujekSatel;IF(satelWOptimum;MAX(0;liczbaPomieszczenZOknami-3);0))",
  }),
  formulaRule({
    key: "funkcjonalne.czujkiDualneQty",
    category: "funkcjonalne",
    label: "Ilość czujek dualnych (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(czyCzujkiRecznie;0;iloscGarazy)",
  }),
  formulaRule({
    key: "funkcjonalne.czujkiBezpieczenstwaQty",
    category: "funkcjonalne",
    label: "Ilość czujek bezpieczeństwa dym/uśpienie (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(czyCzujkiRecznie;iloscCzujekBezpieczenstwa;IF(jestKominek;1;0)+IF(jestGaz;1;0))",
  }),
  formulaRule({
    key: "funkcjonalne.kontaktronOknoDrzwiQty",
    category: "funkcjonalne",
    label: "Ilość kontaktronów okno/drzwi (pomocnicza)",
    contributesToTotal: false,
    expression: "liczbaDrzwiWejsciowych+liczbaWyjscNaTaras",
  }),
  bomRule({
    key: "funkcjonalne.bezpieczenstwo",
    category: "funkcjonalne",
    label: "Systemy bezpieczeństwa",
    gate: "bezpieczenstwoAktywne",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    lines: [
      line("Extension DI", fieldQty("extensionDIQty"), 1828.5),
      line("Zawór odcięcia wody", fieldQty("zaworQty"), 792.35),
      line("Centrala Alarmowa (baza)", fieldQty("satelSlaveQty"), 4632.2),
      line("INT-KNX", fieldQty("satelSlaveQty"), 1219.0),
      line("Syrena alarmowa", fixedQty(1), 365.7),
      line("Czujki sufitowe", fieldQty("czujkiSufitoweQty"), 275.6),
      line("Czujki Dualne", fieldQty("czujkiDualneQty"), 268.18),
      line("Czujki bezpieczeństwa (dym/uśpienie)", fieldQty("czujkiBezpieczenstwaQty"), 381.6),
      line("Kontaktron brama", fieldQty("iloscGarazy"), 365.7),
      line(
        "Kontaktron okno/drzwi",
        fieldQty("kontaktronOknoDrzwiQty"),
        { ifField: "czyOknaCzujnikiFabryczne", whenTrue: 120, whenFalse: 270 },
      ),
      line("Czujka zalania", fieldQty("liczbaPomieszczenWilgotnych"), 426.65),
      line("Klawiatura mała (SATEL)", fieldQty("satelSlaveQty"), 1340.9),
      line("Klawiatura garaż strefowa (SATEL)", fieldQty("satelSlaveQty"), 670.45),
    ],
    labor: {
      hours: formulaQty(
        "zaworQty+satelSlaveQty*18+2+czujkiSufitoweQty*2+czujkiDualneQty+czujkiBezpieczenstwaQty*2+iloscGarazy*2+kontaktronOknoDrzwiQty*2+liczbaPomieszczenWilgotnych*2",
      ),
      ratePerHour: 120,
    },
  }),

  formulaRule({
    key: "funkcjonalne.glowicaQty",
    category: "funkcjonalne",
    label: "Ilość głowic grzejnikowych (pomocnicza)",
    contributesToTotal: false,
    expression: "MAX(0;iloscGrzejnikowSterowanych)",
  }),
  formulaRule({
    key: "funkcjonalne.czujniki1WireQty",
    category: "funkcjonalne",
    label: "Ilość czujników 1-Wire (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(scenyOswietleniowe;strefyOgrzewaniaPodlogowego+2;0)",
  }),
  bomRule({
    key: "funkcjonalne.temperatura",
    category: "funkcjonalne",
    label: "Sterowanie temperaturą",
    gate: "sterowanieTemperatura",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    lines: [
      line("Przekaźnik Loxone 14 kanałów", formulaQty("ROUNDUP(strefyOgrzewaniaPodlogowego/8;0)"), 1584.7),
      line("Rozszerzenie 1-Wire", formulaQty("IF(scenyOswietleniowe;1;0)"), 792.35),
      line("Siłownik Salus", formulaQty("strefyOgrzewaniaPodlogowego*2"), 146.28),
      line("Głowica grzejnika", fieldQty("glowicaQty"), 548.55),
      line("Czujniki 1-Wire", fieldQty("czujniki1WireQty"), 182.85),
    ],
    labor: { hours: formulaQty("glowicaQty+czujniki1WireQty"), ratePerHour: 120 },
  }),

  formulaRule({
    key: "funkcjonalne.roletyRelayQty",
    category: "funkcjonalne",
    label: "Ilość przekaźników — Rolety (pomocnicza)",
    contributesToTotal: false,
    expression: "ROUNDUP((liczbaRolet*2)/14;0)",
  }),
  bomRule({
    key: "funkcjonalne.rolety",
    category: "funkcjonalne",
    label: "Rolety / żaluzje / karnisze",
    gate: "planujeRolety",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    lines: [line("Przekaźnik Loxone 14 kanałów", fieldQty("roletyRelayQty"), 1584.7)],
    labor: { hours: formulaQty("roletyRelayQty*5"), ratePerHour: 120 },
  }),

  formulaRule({
    key: "funkcjonalne.zewnetrzneRelayQty",
    category: "funkcjonalne",
    label: "Ilość przekaźników — Zewnętrzne (pomocnicza)",
    contributesToTotal: false,
    expression: "ROUNDUP((iloscOswietlenZewnetrznych+iloscSekcjiPodlewania)/14;0)",
  }),
  formulaRule({
    key: "funkcjonalne.zewnetrzne",
    category: "funkcjonalne",
    label: "Zewnętrzne (ogród, elewacja)",
    gate: "sterowanieOgrodem",
    postMultipliers: ["wspolczynnikOutdoor"],
    expression:
      "ROUND((zewnetrzneRelayQty*1584.7+1462.8+16*120)*IF(trudnyKlientWspolczynnik>0;trudnyKlientWspolczynnik;1);2)",
    notes:
      "Jedyna kategoria z dwoma mnożnikami naraz (trudny klient × współczynnik outdoor). W źródle to DWA osobne zaokrąglenia z rzędu (najpierw × trudny klient, zaokrąglenie, potem × outdoor, drugie zaokrąglenie) — stąd jawny ROUND() w środku formuły zamiast dwóch reguł postMultipliers na raz. Znalezione i naprawione dzięki szerokiemu testowi porównawczemu (rozbieżność -0,01 zł przy trudny=1,15 i outdoor=1,4).",
  }),

  // ==================================================================================
  // INSTALACJA ELEKTRYCZNA — 1:1 odtworzenie calculateElectricalItems z engine.ts. Jedna
  // duża lista pozycji (BOM) — każda ze swoją formułą ilości (ręczna wartość, jeśli podana,
  // inaczej auto z parametrów domu) i stawką zależną od typu punktu + dopłaty za km.
  // ==================================================================================
  formulaRule({
    key: "elektryka.stawkaStandard",
    category: "elektryka",
    label: "Stawka punktu — standard (pomocnicza)",
    contributesToTotal: false,
    expression: "stawkaStandardBaza+MAX(0;odlegloscKm-referencyjnyDystansKm)*doplataZaKmNettoNaPunkt",
  }),
  formulaRule({
    key: "elektryka.stawkaInteligentny",
    category: "elektryka",
    label: "Stawka punktu — inteligentny dom (pomocnicza)",
    contributesToTotal: false,
    expression: "stawkaInteligentnyBaza+MAX(0;odlegloscKm-referencyjnyDystansKm)*doplataZaKmNettoNaPunkt",
  }),
  formulaRule({
    key: "elektryka.stawkaGotoweUrzadzenie",
    category: "elektryka",
    label: "Stawka punktu — gotowe urządzenie (pomocnicza)",
    contributesToTotal: false,
    expression: "stawkaGotoweUrzadzenieBaza+MAX(0;odlegloscKm-referencyjnyDystansKm)*doplataZaKmNettoNaPunkt",
  }),
  formulaRule({
    key: "elektryka.stawkaPetla",
    category: "elektryka",
    label: "Stawka punktu — pętla/magistrala (pomocnicza)",
    contributesToTotal: false,
    expression: "stawkaPetlaBaza+MAX(0;odlegloscKm-referencyjnyDystansKm)*doplataZaKmNettoNaPunkt",
  }),

  formulaRule({
    key: "elektryka.przyciskiNormalAuto",
    category: "elektryka",
    label: "Przyciski NORMAL — ilość auto z pomieszczeń (pomocnicza)",
    contributesToTotal: false,
    expression:
      "IF(komunikacja;2;0)+liczbaSypialniDodatkowych*2+liczbaPomieszczenWilgotnych+liczbaPozostalychPomieszczen+iloscGarazy+IF(strefaPrywatna;2;0)+IF(strefaOtwarta;3;0)",
  }),
  formulaRule({
    key: "elektryka.przyciskiNormalQty",
    category: "elektryka",
    label: "Przyciski NORMAL — ilość finalna (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(iloscPrzyciskowNormalManual;iloscPrzyciskowNormalValue;przyciskiNormalAuto)",
  }),
  formulaRule({
    key: "elektryka.gniazdaObwodyAuto",
    category: "elektryka",
    label: "Gniazda obwody — ilość auto (pomocnicza)",
    contributesToTotal: false,
    expression:
      "IF(strefaPrywatna;2;0)+IF(strefaOtwarta;4;0)+IF(komunikacja;1;0)+liczbaSypialniDodatkowych+liczbaPomieszczenWilgotnych+liczbaPozostalychPomieszczen+iloscGarazy",
  }),
  formulaRule({
    key: "elektryka.gniazdaObwodyQty",
    category: "elektryka",
    label: "Gniazda obwody — ilość finalna (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(iloscObwodowGniazd230VManual;iloscObwodowGniazd230VValue;gniazdaObwodyAuto)",
  }),
  formulaRule({
    key: "elektryka.gniazdaKolejneAuto",
    category: "elektryka",
    label: "Gniazda kolejne w obwodzie — ilość auto (pomocnicza)",
    contributesToTotal: false,
    expression:
      "IF(strefaPrywatna;6;0)+IF(strefaOtwarta;8;0)+IF(komunikacja;3;0)+liczbaSypialniDodatkowych*3+liczbaPomieszczenWilgotnych+liczbaPozostalychPomieszczen+iloscGarazy*6",
  }),
  formulaRule({
    key: "elektryka.gniazdaKolejneQty",
    category: "elektryka",
    label: "Gniazda kolejne w obwodzie — ilość finalna (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(iloscKolejnychGniazdObwody230VManual;iloscKolejnychGniazdObwody230VValue;gniazdaKolejneAuto)",
  }),
  formulaRule({
    key: "elektryka.gniazda400Auto",
    category: "elektryka",
    label: "Gniazda 400V — ilość auto (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(strefaOtwarta;1;0)+iloscGarazy",
  }),
  formulaRule({
    key: "elektryka.gniazda400Qty",
    category: "elektryka",
    label: "Gniazda 400V — ilość finalna (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(iloscGniazd400VManual;iloscGniazd400VValue;gniazda400Auto)",
  }),
  formulaRule({
    key: "elektryka.oswietleniePunktyQty",
    category: "elektryka",
    label: "Oświetlenie punkty ON/LED — ilość finalna (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(iloscObwodowOswietleniaWszystkichManual;iloscObwodowOswietleniaWszystkichValue;oswietleniePunkty)",
  }),
  formulaRule({
    key: "elektryka.oswietlenieKolejneAuto",
    category: "elektryka",
    label: "Oświetlenie kolejne w obwodzie — ilość auto (pomocnicza)",
    contributesToTotal: false,
    expression: "oswietleniePunkty*IF(korzystamZArchitekta;1.5;0.5)",
  }),
  formulaRule({
    key: "elektryka.oswietlenieKolejneQty",
    category: "elektryka",
    label: "Oświetlenie kolejne w obwodzie — ilość finalna (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(iloscOswietleniaKolejneManual;iloscOswietleniaKolejneValue;oswietlenieKolejneAuto)",
  }),
  formulaRule({
    key: "elektryka.glosnikiAuto",
    category: "elektryka",
    label: "Instalacja do głośników — ilość auto (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(strefaOtwarta;5;0)+IF(strefaPrywatna;2;0)+liczbaSypialniDodatkowych+liczbaPozostalychPomieszczen",
  }),
  formulaRule({
    key: "elektryka.glosnikiQty",
    category: "elektryka",
    label: "Instalacja do głośników — ilość finalna (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(iloscKabliGlosnikowychManual;iloscKabliGlosnikowychValue;glosnikiAuto)",
  }),
  formulaRule({
    key: "elektryka.lanTvAuto",
    category: "elektryka",
    label: "Instalacja do TV/LAN — ilość auto (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(strefaPrywatna;2;0)+IF(strefaOtwarta;2;0)+liczbaSypialniDodatkowych+5",
  }),
  formulaRule({
    key: "elektryka.lanTvQty",
    category: "elektryka",
    label: "Instalacja do TV/LAN — ilość finalna (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(iloscGniazdLanTvManual;iloscGniazdLanTvValue;lanTvAuto)",
  }),
  formulaRule({
    key: "elektryka.kanalyAuto",
    category: "elektryka",
    label: "Kanały/przepusty TV — ilość auto (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(strefaPrywatna;1;0)+IF(strefaOtwarta;1;0)+liczbaSypialniDodatkowych",
  }),
  formulaRule({
    key: "elektryka.kanalyQty",
    category: "elektryka",
    label: "Kanały/przepusty TV — ilość finalna (pomocnicza)",
    contributesToTotal: false,
    expression: "IF(iloscKanalowTvManual;iloscKanalowTvValue;kanalyAuto)",
  }),
  formulaRule({
    key: "elektryka.sumaPunktowDoPomiarow",
    category: "elektryka",
    label: "Suma punktów do pomiarów wewnętrznych (pomocnicza)",
    contributesToTotal: false,
    notes: "Odtwarza sumę ilości wszystkich pozycji WCZEŚNIEJSZYCH niż „pomiary” w źródłowej liście (El rozbudowa) — dokładnie te same pozycje, w tej samej kolejności.",
    expression:
      "1" + // podstawowe wyposażenie
      "+iloscGarazy" + // dopłata brama garażowa
      "+iloscPrzyciskowPrestiz" +
      "+przyciskiNormalQty" +
      "+gniazdaObwodyQty" +
      "+gniazdaKolejneQty" +
      "+gniazda400Qty" +
      "+oswietleniePunktyQty" +
      "+oswietlenieKolejneQty" +
      "+IF(planujeRolety;liczbaRolet;0)" +
      "+IF(sterowanieOgrodem;8;0)" + // zewnętrzne oświetlenie
      "+IF(sterowanieOgrodem;4;0)" + // podlewanie
      "+IF(sterowanieOgrodem;1;0)" + // czujnik deszczu
      "+IF(instalacjaDoGlosnikow;glosnikiQty;0)" +
      "+IF(instalacjaDoMonitoringu;iloscKamerMonitoringu;0)" +
      "+IF(instalacjaDoTelewizjiLubLan;lanTvQty;0)" +
      "+IF(kanalyPrzepustyDoTv;kanalyQty;0)" +
      "+IF(instalacjaMasztuAnteny;1;0)" +
      "+IF(rozdzielniaBudowlana;1;0)" +
      "+1" + // obsadzenie rozdzielni głównej
      "+IF(przylaczeDoDomu;dlugoscPrzylaczaM;0)" +
      "+IF(formalnosciOdbiorowe;1;0)",
  }),

  bomRule({
    key: "elektryka.instalacja",
    category: "elektryka",
    label: "Instalacja elektryczna",
    lines: [
      line("Podstawowe wyposażenie instalacji (czujki, bramy, furtka, domofon, rozdzielnice pomocnicze)", fixedQty(1), { formula: "podstawoweWyposazenieInstalacji" }),
      line("Dopłata za bramę garażową", fieldQty("iloscGarazy"), { formula: "doplataZaBrameGarazowa" }),
      line("Przyciski szklane (PRESTIŻ)", fieldQty("iloscPrzyciskowPrestiz"), { formula: "cenaPrzyciskuPrestiz" }),
      line("Przyciski plastikowe / dotykowe (NORMAL)", fieldQty("przyciskiNormalQty"), { formula: "cenaPrzyciskuNormal" }),
      line("Gniazda — obwody", fieldQty("gniazdaObwodyQty"), { formula: "stawkaInteligentny" }),
      line("Gniazda — kolejne w obwodzie", fieldQty("gniazdaKolejneQty"), { formula: "stawkaStandard" }),
      line("Gniazda 400V", fieldQty("gniazda400Qty"), { formula: "stawkaGotoweUrzadzenie" }),
      line("Oświetlenie — punkty ON/LED", fieldQty("oswietleniePunktyQty"), { formula: "stawkaInteligentny" }),
      line("Oświetlenie — kolejne w obwodzie", fieldQty("oswietlenieKolejneQty"), { formula: "stawkaStandard" }),
      line("Rolety — zasilanie", formulaQty("IF(planujeRolety;liczbaRolet;0)"), { formula: "stawkaInteligentny" }),
      line("Oświetlenie zewnętrzne i ogród", formulaQty("IF(sterowanieOgrodem;8;0)"), { formula: "stawkaInteligentny" }),
      line("Podlewanie ogrodu", formulaQty("IF(sterowanieOgrodem;4;0)"), { formula: "stawkaInteligentny" }),
      line("Czujnik deszczu", formulaQty("IF(sterowanieOgrodem;1;0)"), { formula: "stawkaInteligentny" }),
      line("Instalacja do głośników", formulaQty("IF(instalacjaDoGlosnikow;glosnikiQty;0)"), { formula: "stawkaInteligentny" }),
      line("Instalacja do monitoringu", formulaQty("IF(instalacjaDoMonitoringu;iloscKamerMonitoringu;0)"), { formula: "stawkaInteligentny" }),
      line("Instalacja do TV / LAN", formulaQty("IF(instalacjaDoTelewizjiLubLan;lanTvQty;0)"), { formula: "stawkaInteligentny" }),
      line("Kanały / przepusty do TV", formulaQty("IF(kanalyPrzepustyDoTv;kanalyQty;0)"), { formula: "kanalTv" }),
      line("Instalacja masztu antenowego z anteną", formulaQty("IF(instalacjaMasztuAnteny;1;0)"), { formula: "antenaZMasztem" }),
      line("Dzierżawa rozdzielni budowlanej", formulaQty("IF(rozdzielniaBudowlana;1;0)"), { formula: "dzierzawaRozdzielniBudowlanej" }),
      line("Obsadzenie rozdzielni głównej", fixedQty(1), { formula: "obsadzenieRozdzielniGlownej" }),
      line("Przyłącze elektryczne do domu", formulaQty("IF(przylaczeDoDomu;dlugoscPrzylaczaM;0)"), { formula: "przylaczeZaMetr" }),
      line("Formalności odbiorowe", formulaQty("IF(formalnosciOdbiorowe;1;0)"), { formula: "formalnosciOdbioroweCena" }),
      line("Pomiary wewnętrzne i uziemienia", formulaQty("IF(pomiaryWewnetrzne;sumaPunktowDoPomiarow;0)"), { formula: "pomiaryWewnetrzneZaPunkt" }),
      line("Dodatkowe bruzdowanie", fieldQty("dodatkoweBruzdowanieM"), { formula: "dodatkoweBruzdowanieZaMetr" }),
    ],
  }),
  formulaRule({
    key: "elektryka.rabatKompleksowosci",
    category: "elektryka",
    label: "Rabat kompleksowości instalacji",
    expression: "IF(kompleksowaInstalacja;-1*ROUND(ROUND(instalacja;2)*(instalacjaKompleksowaPercent/100);2);0)",
    notes:
      "Ujemna pozycja (rabat) — obniża sumę kategorii Elektryka. Dotyczy WYŁĄCZNIE tej kategorii, nie całej oferty. Trzy celowe detale zgodne ze źródłem co do grosza: (1) rabat liczy się od JUŻ ZAOKRĄGLONEJ sumy instalacji, nie surowej; (2) nawiasy wokół (percent/100) wymuszają TĘ SAMĄ kolejność działań co w źródle (net*(percent/100), nie (net*percent)/100) — różna kolejność mnożenia/dzielenia daje różny wynik zmiennoprzecinkowy dokładnie na granicy pół grosza; (3) kwota rabatu jest zaokrąglana jako liczba DODATNIA przed zanegowaniem, bo Math.round() w JS zaokrągla -x.5 w dół, nie w górę jak dla +x.5. Wszystkie trzy znalezione szerokim testem porównawczym.",
  }),

  // ==================================================================================
  // DODATKI — 1:1 odtworzenie calculateAddons z engine.ts. 22 niezależne pozycje typu
  // ilość×cena, każda z własnym checkboxem. Większość skaluje się trudnym klientem —
  // 6 (rozdzielnia +++ i 5 dodatków premium) świadomie nie, zgodnie ze źródłem.
  // ==================================================================================
  quantityRule({
    key: "dodatki.stacjaPogodowa",
    category: "dodatki",
    label: "Stacja pogodowa",
    gate: "addon_stacjaPogodowa",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(1),
    unitPrice: 3150,
  }),
  quantityRule({
    key: "dodatki.oswietlenieSciemniane230V",
    category: "dodatki",
    label: "Oświetlenie ściemniane 230V",
    gate: "addon_oswietlenieSciemniane230V",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: formulaQty("ROUNDUP(iloscOswSciemniane/4;0)"),
    unitPrice: 2316.1,
  }),
  quantityRule({
    key: "dodatki.oswietlenieKoloroweRGBW",
    category: "dodatki",
    label: "Oświetlenie kolorowe RGBW",
    gate: "addon_oswietlenieKoloroweRGBW",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(1),
    unitPrice: 687.6,
  }),
  quantityRule({
    key: "dodatki.czujnikiOtwarciaOkien",
    category: "dodatki",
    label: "Czujniki otwarcia okien",
    gate: "addon_czujnikiOtwarciaOkien",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fieldQty("liczbaOkienOtwieranych"),
    unitPrice: { ifField: "czyOknaCzujnikiFabryczne", whenTrue: 120, whenFalse: 270 },
    notes: "Ta sama cena jednostkowa co kontaktron w kategorii Bezpieczeństwo (ZESTAWIENIE!F36).",
  }),
  quantityRule({
    key: "dodatki.klawiaturyNfc",
    category: "dodatki",
    label: "Klawiatury dostępowe NFC",
    gate: "addon_klawiaturyNfc",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fieldQty("iloscKlawiaturNfc"),
    unitPrice: 1950.4,
  }),
  quantityRule({
    key: "dodatki.przygotowanieDostepuDrzwi",
    category: "dodatki",
    label: "Elektrozaczep do drzwi",
    gate: "addon_przygotowanieDostepuDrzwi",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fieldQty("iloscElektrozaczepow"),
    unitPrice: 731.4,
  }),
  quantityRule({
    key: "dodatki.bezpieczenstwoPlusPlusPlus",
    category: "dodatki",
    label: "Dodatkowe czujki bezpieczeństwa (dym/uśpienie)",
    gate: "addon_bezpieczenstwoPlusPlusPlus",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(2),
    unitPrice: 609.5,
    notes: "Stała ilość 2, niezależna od parametrów domu (zweryfikowane empirycznie).",
  }),
  quantityRule({
    key: "dodatki.sterowaneGniazda",
    category: "dodatki",
    label: "Sterowane gniazda",
    gate: "addon_sterowaneGniazda",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(1),
    unitPrice: 2681.8,
  }),
  quantityRule({
    key: "dodatki.dodatkowyLicznikPradu",
    category: "dodatki",
    label: "Dodatkowy licznik prądu",
    gate: "addon_dodatkowyLicznikPradu",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(1),
    unitPrice: 1828.5,
  }),
  quantityRule({
    key: "dodatki.dodatkowyZasilaczUps",
    category: "dodatki",
    label: "Dodatkowy zasilacz UPS (rolety)",
    gate: "addon_dodatkowyZasilaczUps",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(1),
    unitPrice: 1900,
    notes: "Zaznaczenie tego dodatku dolicza też +500 zł do pozycji „Baza zasilania — zasilacze LED”.",
  }),
  quantityRule({
    key: "dodatki.rozdzielniaPlusPlusPlus",
    category: "dodatki",
    label: "Rozdzielnia +++ (przeszklona)",
    gate: "addon_rozdzielniaPlusPlusPlus",
    quantity: fixedQty(1),
    unitPrice: 3500,
    notes: "Bez współczynnika trudny klient (zgodnie ze źródłem).",
  }),
  quantityRule({
    key: "dodatki.budzikInteligentny",
    category: "dodatki",
    label: "Budzik inteligentny",
    gate: "addon_budzikInteligentny",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(1),
    unitPrice: 1500,
  }),
  quantityRule({
    key: "dodatki.przyciskUkryty",
    category: "dodatki",
    label: "Przycisk ukryty Touch Surface",
    gate: "addon_przyciskUkryty",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(1),
    unitPrice: 1500,
  }),
  quantityRule({
    key: "dodatki.stacjaDokujacaIpad",
    category: "dodatki",
    label: "Stacja dokująca do iPada",
    gate: "addon_stacjaDokujacaIpad",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(1),
    unitPrice: 1462.8,
    notes: "Stała ilość 1 — nie skaluje się żadną ilością (zweryfikowane, DANE!T89).",
  }),
  quantityRule({
    key: "dodatki.ipad",
    category: "dodatki",
    label: "iPad",
    gate: "addon_ipad",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(1),
    unitPrice: 2925.6,
    notes: "Stała ilość 1 — nie skaluje się żadną ilością (zweryfikowane, DANE!T90).",
  }),
  quantityRule({
    key: "dodatki.oswietlenieAwaryjne",
    category: "dodatki",
    label: "Oświetlenie awaryjne (podtrzymanie LED)",
    gate: "addon_oswietlenieAwaryjne",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: fixedQty(1),
    unitPrice: 1462.8,
  }),
  quantityRule({
    key: "dodatki.integracjeZInnymiSystemami",
    category: "dodatki",
    label: "Integracje z innymi systemami (klimatyzacja/wentylacja/rekuperacja/pompa ciepła)",
    gate: "addon_integracjeZInnymiSystemami",
    postMultipliers: ["trudnyKlientWspolczynnik"],
    quantity: formulaQty(
      "IF(platneIntegracjeZInnymiSystemami;IF(integracjaKlimatyzacja;1;0)+IF(integracjaWentylacja;1;0)+IF(integracjaRekuperacja;1;0)+IF(integracjaPompaCiepla;1;0);0)",
    ),
    unitPrice: 1950.4,
    notes:
      "CRM!Q5 „Płatne integracje z innymi systemami” — dodatkowy warunek AND, zeruje pozycję niezależnie od zaznaczonych integracji (znaleziony błąd w oryginalnym silniku, naprawiony wcześniej: bez tej bramki pozycja była zawyżana — potwierdzone na realnym przykładzie, różnica 4290,88 zł).",
  }),
  quantityRule({
    key: "dodatki.dokumentacjaPowykonawcza",
    category: "dodatki",
    label: "Dokumentacja powykonawcza",
    gate: "addon_dokumentacjaPowykonawcza",
    quantity: fixedQty(1),
    unitPrice: 0,
    notes: "0 zł zawsze — pozycja informacyjna „w cenie”, bez trudnego klienta.",
  }),
  quantityRule({
    key: "dodatki.ustaleniaZInnymiBranzami",
    category: "dodatki",
    label: "Ustalenia z innymi branżami z ramienia Inwestora",
    gate: "addon_ustaleniaZInnymiBranzami",
    quantity: fixedQty(1),
    unitPrice: 3000,
    notes: "Bez współczynnika trudny klient (zgodnie ze źródłem).",
  }),
  quantityRule({
    key: "dodatki.konsultacjeZdalne24_7",
    category: "dodatki",
    label: "Konsultacje zdalne 24/7 (w czasie gwarancji)",
    gate: "addon_konsultacjeZdalne24_7",
    quantity: fixedQty(1),
    unitPrice: 3000,
    notes: "Bez współczynnika trudny klient (zgodnie ze źródłem).",
  }),
  quantityRule({
    key: "dodatki.przedluzenieGwarancji12Miesiecy",
    category: "dodatki",
    label: "Przedłużenie gwarancji o 12 miesięcy",
    gate: "addon_przedluzenieGwarancji12Miesiecy",
    quantity: fixedQty(1),
    unitPrice: 4000,
    notes: "Bez współczynnika trudny klient (zgodnie ze źródłem).",
  }),
  quantityRule({
    key: "dodatki.gwarancjaCenyOfertowej",
    category: "dodatki",
    label: "Gwarancja ceny od oferty do końca realizacji",
    gate: "addon_gwarancjaCenyOfertowej",
    quantity: fixedQty(1),
    unitPrice: 1500,
    notes: "Bez współczynnika trudny klient (zgodnie ze źródłem).",
  }),
];

export const CALCULATOR_RULES_ID = "calculator_rules";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Normalizuje dane z bazy do CalculatorRule[] — przy braku/błędnych danych wraca do domyślnego zestawu reguł. */
export function normalizeCalculatorRules(value: unknown): CalculatorRule[] {
  const arr = asArray(value);
  if (arr.length === 0) {
    return DEFAULT_CALCULATOR_RULES;
  }
  // Reguły są już w pełni ustrukturyzowanym jsonb (bez częściowych/starych kształtów do migracji na
  // razie) — walidacja poprawności formuł odbywa się przy zapisie w edytorze (validateFormula).
  return arr as CalculatorRule[];
}
