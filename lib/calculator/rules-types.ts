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

/** Cena warunkowa — jedyny "warunek" dopuszczalny bez pisania formuły (np. czujnik: fabryczny/standard). */
export type ConditionalPrice = {
  ifField: string;
  whenTrue: number;
  whenFalse: number;
};

export type RulePrice = number | ConditionalPrice;

export function isConditionalPrice(price: RulePrice): price is ConditionalPrice {
  return typeof price === "object" && price !== null;
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
  unitPrice: number;
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

/**
 * Reguły kategorii "Baza systemu" — 1:1 odtworzenie calculateBaseSystem/calculateBazaZasilania
 * z engine.ts (patrz komentarze źródłowe tam: DANE!T109:T111). Kolejność ma znaczenie: reguły
 * pomocnicze (contributesToTotal=false) muszą być zadeklarowane PRZED regułami, które się do nich
 * odwołują w formule (silnik liczy od góry do dołu, jak w arkuszu kalkulacyjnym).
 */
export const DEFAULT_CALCULATOR_RULES: CalculatorRule[] = [
  // --- pomocnicze (nie wliczają się same w sobie do sumy, tylko udostępniają wartość formułom niżej) ---
  formulaRule({
    key: "baza.oswietleniePunkty",
    category: "baza",
    label: "Punkty oświetlenia — obwody ON/OFF + ściemniane LED 24V (pomocnicza)",
    contributesToTotal: false,
    expression:
      "(IF(strefaPrywatna;4;0)+IF(strefaOtwarta;6;0)+IF(komunikacja;2;0)+liczbaSypialniDodatkowych*2+liczbaPomieszczenWilgotnych+liczbaPozostalychPomieszczen*2+iloscGarazy*2)" +
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
