import { describe, expect, it } from "vitest";
import { calculateBaseSystem, calculateCalculatorTotals, calculateElectricalItems } from "@/lib/calculator/engine";
import { DEFAULT_CALCULATOR_SETTINGS } from "@/lib/calculator/settings";
import { emptyCalculatorAnswers } from "@/lib/calculator/types";

/**
 * Weryfikacja silnika kalkulatora. Wartości startowe w `lib/calculator/settings.ts` zostały
 * zweryfikowane EMPIRYCZNIE przeciw realnemu plikowi
 * "Oferta cenowa Luksystem INTELIGETNY DOM_Pakiety_v21.xlsx" — przeliczonemu biblioteką
 * `formulas` (nie tylko odczyt statycznych komórek) dla konkretnych scenariuszy wejściowych,
 * ścieżka pakietu OPTIMUM. Testy niżej powtarzają te same scenariusze i sprawdzają zgodność
 * 1:1 z realnymi wynikami arkusza (DANE!T108:T113, Pakiety!J41/J42).
 */

describe("calculateBaseSystem — zweryfikowane przeciw DANE!T109:T111", () => {
  it("jedna kondygnacja: projekt=4000, wykonanie rozdzielni=14520, baza=12728.33", () => {
    const answers = emptyCalculatorAnswers();
    answers.liczbaKondygnacji = 1;
    const result = calculateBaseSystem(answers, DEFAULT_CALCULATOR_SETTINGS);

    expect(result.wieleKondygnacji).toBe(false);
    expect(result.projektNet).toBe(4000);
    expect(result.rozdzielniaWykonanieNet).toBe(14520);
    expect(result.bazaZasilanieNet).toBe(12728.33);
  });

  it("wiele kondygnacji: projekt=6000, wykonanie rozdzielni=17640, baza=11928.33", () => {
    const answers = emptyCalculatorAnswers();
    answers.liczbaKondygnacji = 2;
    const result = calculateBaseSystem(answers, DEFAULT_CALCULATOR_SETTINGS);

    expect(result.wieleKondygnacji).toBe(true);
    expect(result.projektNet).toBe(6000);
    expect(result.rozdzielniaWykonanieNet).toBe(17640);
    expect(result.bazaZasilanieNet).toBe(11928.33);
  });

  it("powierzchnia NIE wpływa na próg bazy systemu (potwierdzone empirycznie — tylko kondygnacje)", () => {
    const answers = emptyCalculatorAnswers();
    answers.liczbaKondygnacji = 1;
    const small = calculateBaseSystem({ ...answers, powierzchniaM2: 60 }, DEFAULT_CALCULATOR_SETTINGS);
    const large = calculateBaseSystem({ ...answers, powierzchniaM2: 250 }, DEFAULT_CALCULATOR_SETTINGS);

    expect(small.totalNet).toBe(large.totalNet);
  });

  it("dom >= 400m² dostaje dopłatę do projektu (KALKULATOR!N29)", () => {
    const answers = emptyCalculatorAnswers();
    answers.powierzchniaM2 = 400;
    const result = calculateBaseSystem(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(result.projektNet).toBe(4000 + 2000);
  });

  it("współczynnik projekt (CRM!Q23) mnoży czysto tylko projekt — zweryfikowane ×2 -> 8000", () => {
    const answers = emptyCalculatorAnswers();
    answers.wspolczynnikProjekt = 2;
    const result = calculateBaseSystem(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(result.projektNet).toBe(8000);
    expect(result.rozdzielniaWykonanieNet).toBe(14520); // nietknięte
  });
});

describe("calculateCalculatorTotals — kategorie funkcjonalne jako stała cena (nie poziom)", () => {
  it("bez żadnej funkcjonalności — kategorie funkcjonalne = 0", () => {
    const answers = emptyCalculatorAnswers();
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(totals.functionalNet).toBe(0);
    expect(totals.functional.every((item) => !item.selected)).toBe(true);
  });

  it("bezpieczeństwo (alarmIKontrolaDostepu) = 14930.70 (zweryfikowane, delta T112)", () => {
    const answers = emptyCalculatorAnswers();
    answers.alarmIKontrolaDostepu = true;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const item = totals.functional.find((entry) => entry.category === "bezpieczenstwo");
    expect(item?.net).toBe(14930.7);
  });

  it("tylko rozdzielnia zeruje bezpieczeństwo mimo zaznaczonego alarmu (DANE!T112 formuła)", () => {
    const answers = emptyCalculatorAnswers();
    answers.alarmIKontrolaDostepu = true;
    answers.tylkoRozdzielnia = true;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const item = totals.functional.find((entry) => entry.category === "bezpieczenstwo");
    expect(item?.net).toBe(0);
  });

  it("temperatura=4677.16, rolety=4369.40, zewnętrzne=4967.50, oświetlenie=2559.90 (zweryfikowane)", () => {
    const answers = emptyCalculatorAnswers();
    answers.sterowanieTemperatura = true;
    answers.planujeRolety = true;
    answers.sterowanieOgrodem = true;
    answers.scenyOswietleniowe = true;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const net = (category: string) => totals.functional.find((entry) => entry.category === category)?.net;
    expect(net("temperatura")).toBe(4677.16);
    expect(net("rolety")).toBe(4369.4);
    expect(net("zewnetrzne")).toBe(4967.5);
    expect(net("oswietlenie")).toBe(2559.9);
  });

  it("ręcznie wpisane dodatkowe czujki dolicza się do budżetu bezpieczeństwa (orientacyjnie, poza checkboxem)", () => {
    const answers = emptyCalculatorAnswers();
    answers.iloscCzujekDodatkowychRecznie = 4;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const item = totals.functional.find((entry) => entry.category === "bezpieczenstwo");
    expect(item?.selected).toBe(true);
    expect(item?.net).toBe(4 * DEFAULT_CALCULATOR_SETTINGS.extras.cenaZaDodatkowaCzujke);
  });

  it("dodatkowe czujki sumują się z ceną kategorii, gdy alarm też zaznaczony", () => {
    const answers = emptyCalculatorAnswers();
    answers.alarmIKontrolaDostepu = true;
    answers.iloscCzujekDodatkowychRecznie = 2;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const item = totals.functional.find((entry) => entry.category === "bezpieczenstwo");
    expect(item?.net).toBe(14930.7 + 2 * DEFAULT_CALCULATOR_SETTINGS.extras.cenaZaDodatkowaCzujke);
  });

  it("współczynnik outdoor (CRM!Q25) mnoży tylko zewnętrzne — zweryfikowane ×2 -> 9935", () => {
    const answers = emptyCalculatorAnswers();
    answers.sterowanieOgrodem = true;
    answers.wspolczynnikOutdoor = 2;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const item = totals.functional.find((entry) => entry.category === "zewnetrzne");
    expect(item?.net).toBe(9935);
  });
});

describe("calculateElectricalItems — model itemizowany (ilości × stawka wg typu)", () => {
  it("bez zaznaczonych pomieszczeń/toggle'ów — tylko pozycje zawsze wliczone", () => {
    const answers = emptyCalculatorAnswers();
    const items = calculateElectricalItems(answers, DEFAULT_CALCULATOR_SETTINGS);
    const keys = items.map((entry) => entry.key);
    expect(keys).toEqual(["podstawowe_wyposazenie", "obsadzenie_rg"]);
  });

  it("strefa prywatna generuje pozycję gniazd wg stawki ID (162 zł)", () => {
    const answers = emptyCalculatorAnswers();
    answers.strefaPrywatna = true;
    const items = calculateElectricalItems(answers, DEFAULT_CALCULATOR_SETTINGS);
    const gniazda = items.find((entry) => entry.key === "gniazda_obwody");
    expect(gniazda?.quantity).toBe(2);
    expect(gniazda?.unitPrice).toBe(162);
    expect(gniazda?.net).toBe(324);
  });

  it("ręczna ilość nadpisuje automatyczne wyliczenie", () => {
    const answers = emptyCalculatorAnswers();
    answers.strefaPrywatna = true;
    answers.iloscObwodowGniazd230V = 50;
    const items = calculateElectricalItems(answers, DEFAULT_CALCULATOR_SETTINGS);
    const gniazda = items.find((entry) => entry.key === "gniazda_obwody");
    expect(gniazda?.quantity).toBe(50);
  });

  it("monitoring liczony tylko gdy zaznaczona instalacja do monitoringu", () => {
    const answers = emptyCalculatorAnswers();
    answers.iloscKamerMonitoringu = 8;
    const withoutToggle = calculateElectricalItems(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(withoutToggle.find((entry) => entry.key === "monitoring")).toBeUndefined();

    answers.instalacjaDoMonitoringu = true;
    const withToggle = calculateElectricalItems(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(withToggle.find((entry) => entry.key === "monitoring")?.quantity).toBe(8);
  });

  it("podstawowe wyposażenie instalacji jest zawsze wliczone (~4239 zł, El rozbudowa K33, zweryfikowane)", () => {
    const answers = emptyCalculatorAnswers();
    const items = calculateElectricalItems(answers, DEFAULT_CALCULATOR_SETTINGS);
    const baza = items.find((entry) => entry.key === "podstawowe_wyposazenie");
    expect(baza?.net).toBe(4239);
  });

  it("brama garażowa dolicza dopłatę do podstawowego wyposażenia — zweryfikowane ×2 -> +324", () => {
    const answers = emptyCalculatorAnswers();
    answers.liczbaBramGarazowych = 2;
    const items = calculateElectricalItems(answers, DEFAULT_CALCULATOR_SETTINGS);
    const doplata = items.find((entry) => entry.key === "doplata_brama_garazowa");
    expect(doplata?.net).toBe(324);
  });

  it("przyciski PRESTIŻ/NORMAL liczone ilość × cena z ustawień (wycena orientacyjna)", () => {
    const answers = emptyCalculatorAnswers();
    answers.iloscPrzyciskowPrestiz = 3;
    answers.iloscPrzyciskowNormal = 5;
    const items = calculateElectricalItems(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(items.find((entry) => entry.key === "przyciski_prestiz")?.net).toBe(
      3 * DEFAULT_CALCULATOR_SETTINGS.extras.cenaPrzyciskuPrestiz,
    );
    expect(items.find((entry) => entry.key === "przyciski_normal")?.net).toBe(
      5 * DEFAULT_CALCULATOR_SETTINGS.extras.cenaPrzyciskuNormal,
    );
  });

  it("kompleksowa instalacja daje rabat na sumę pozycji elektrycznych", () => {
    const answers = emptyCalculatorAnswers();
    answers.strefaPrywatna = true;
    answers.strefaOtwarta = true;
    const bez = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const zRabatem = calculateCalculatorTotals({ ...answers, kompleksowaInstalacja: true }, DEFAULT_CALCULATOR_SETTINGS);
    expect(zRabatem.electrical.discountNet).toBeGreaterThan(0);
    expect(zRabatem.electrical.finalNet).toBeLessThan(bez.electrical.net);
  });
});

describe("calculateCalculatorTotals — pozostała mechanika", () => {
  it("rabat na inne systemy jest proporcjonalny do liczby wybranych spośród wszystkich", () => {
    const answers = emptyCalculatorAnswers();
    answers.otherSystems.sieciLan = true;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);

    expect(totals.otherSystems.discountPercent).toBeCloseTo((1 / 8) * 15, 2);
    expect(totals.otherSystems.discountNet).toBeCloseTo(
      totals.otherSystems.selectedNet * (totals.otherSystems.discountPercent / 100),
      2,
    );
  });

  it("trudny klient (>1,0) mnoży wartość główną, ale nie instalację elektryczną/inne systemy", () => {
    const answers = emptyCalculatorAnswers();
    answers.alarmIKontrolaDostepu = true;
    const base = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const trudny = calculateCalculatorTotals({ ...answers, trudnyKlientWspolczynnik: 1.2 }, DEFAULT_CALCULATOR_SETTINGS);

    expect(trudny.mainNet).toBeCloseTo(base.mainNet * 1.2, 0);
  });

  it("płatność z góry obniża sumę końcową o skonfigurowany procent", () => {
    const answers = emptyCalculatorAnswers();
    answers.alarmIKontrolaDostepu = true;
    const base = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const zGory = calculateCalculatorTotals({ ...answers, platnoscZGory: true }, DEFAULT_CALCULATOR_SETTINGS);

    const expectedSubtotal = base.mainNet + base.electrical.finalNet + base.otherSystems.finalNet;
    expect(zGory.platnoscZGoryDiscountNet).toBeCloseTo(
      expectedSubtotal * (DEFAULT_CALCULATOR_SETTINGS.discounts.platnoscZGoryPercent / 100),
      2,
    );
  });

  it("stacja dokująca i iPad skalują się razem z ilością (Pakiety!E65/E67)", () => {
    const answers = emptyCalculatorAnswers();
    answers.addons.stacjaDokujacaIpad = true;
    answers.addons.ipad = true;
    answers.iloscStacjiDokujacychZIpadem = 3;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);

    const stacja = totals.addons.find((item) => item.key === "stacjaDokujacaIpad");
    const ipad = totals.addons.find((item) => item.key === "ipad");
    expect(stacja?.net).toBe(DEFAULT_CALCULATOR_SETTINGS.addons.stacjaDokujacaIpad * 3);
    expect(ipad?.net).toBe(DEFAULT_CALCULATOR_SETTINGS.addons.ipad * 3);
  });
});
