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
  /** Czy współczynnik "trudny klient" mnoży wynik tej reguły (większość dodatków: tak; premium/rozdzielnia+++: nie). */
  appliesTrudnyKlient: boolean;
  /** Nazwa zmiennej (pole ankiety), która mnoży wynik PO policzeniu bazy — np. współczynnik projektu/rozdzielnicy/outdoor. */
  postMultiplier: string | null;
  /** Notatka redakcyjna widoczna w edytorze — np. "uproszczenie: ..." albo "niezweryfikowane empirycznie". */
  notes: string | null;
};

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

/** Przykład: "Baza zasilania — wstępna konfiguracja" (dziś: IF(kondygnacje>1;1500;2500) × wspRozdzielnica). */
export function exampleWstepnaKonfiguracjaRule(): TieredRule {
  return {
    key: "baza.wstepnaKonfiguracja",
    category: "baza",
    label: "Baza zasilania — wstępna konfiguracja",
    gate: null,
    appliesTrudnyKlient: false,
    postMultiplier: "wspolczynnikRozdzielnica",
    notes: null,
    kind: "tiered",
    input: { type: "field", field: "liczbaKondygnacji" },
    tiers: [
      { upTo: 1, amount: 2500 },
      { upTo: null, amount: 1500 },
    ],
  };
}
