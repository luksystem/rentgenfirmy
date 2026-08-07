import { describe, expect, it } from "vitest";
import { calculateAddons, calculateBaseSystem, calculateCalculatorTotals, calculateElectricalItems } from "@/lib/calculator/engine";
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

  it("wykonanie rozdzielni skaluje się z liczbą punktów elektrycznych (nie tylko kondygnacjami) — realny przykład: 317.5 pkt -> próg 9000 zł, 17520 zł łącznie", () => {
    const answers = emptyCalculatorAnswers();
    answers.liczbaKondygnacji = 1;
    answers.strefaPrywatna = true;
    answers.strefaOtwarta = true;
    answers.komunikacja = true;
    answers.liczbaSypialniDodatkowych = 5;
    answers.liczbaPomieszczenWilgotnych = 4;
    answers.liczbaPozostalychPomieszczen = 1;
    answers.iloscGarazy = 1;
    answers.liczbaOkienOtwieranych = 10;
    answers.liczbaRolet = 8;
    answers.korzystamZArchitekta = true;
    answers.strefyOgrzewaniaPodlogowego = 14;
    answers.instalacjaDoTelewizjiLubLan = true;
    answers.instalacjaDoGlosnikow = true;
    answers.instalacjaDoMonitoringu = true;
    answers.iloscKamerMonitoringu = 8;
    answers.sterowanieOgrodem = true;
    answers.iloscOswietlenZewnetrznych = 4;
    answers.iloscSekcjiPodlewania = 4;

    const result = calculateBaseSystem(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(result.rozdzielniaWykonanieNet).toBe(17520);
  });
});

describe("calculateCalculatorTotals — kategorie funkcjonalne jako lista materiałowa (BOM)", () => {
  it("bez żadnej funkcjonalności — kategorie funkcjonalne = 0", () => {
    const answers = emptyCalculatorAnswers();
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(totals.functionalNet).toBe(0);
    expect(totals.functional.every((item) => !item.selected)).toBe(true);
  });

  it("tylko rozdzielnia zeruje bezpieczeństwo mimo zaznaczonego alarmu (DANE!T112 formuła)", () => {
    const answers = emptyCalculatorAnswers();
    answers.alarmIKontrolaDostepu = true;
    answers.tylkoRozdzielnia = true;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const item = totals.functional.find((entry) => entry.category === "bezpieczenstwo");
    expect(item?.net).toBe(0);
  });

  it("współczynnik outdoor (CRM!Q25) mnoży tylko zewnętrzne — domyślne ilości (4+4 -> ×2 -> 9935)", () => {
    const answers = emptyCalculatorAnswers();
    answers.sterowanieOgrodem = true;
    answers.wspolczynnikOutdoor = 2;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const item = totals.functional.find((entry) => entry.category === "zewnetrzne");
    expect(item?.net).toBe(9935);
  });

  it("realny przykład oferty klienta (2647-08-26-852) — wszystkie 5 kategorii zgodne co do grosza z arkuszem DANE", () => {
    const answers = emptyCalculatorAnswers();
    answers.powierzchniaM2 = 250;
    answers.liczbaPomieszczenZOknami = 14;
    answers.liczbaDrzwiWejsciowych = 1;
    answers.liczbaWyjscNaTaras = 1;
    answers.liczbaKondygnacji = 1;
    answers.czyOknaCzujnikiFabryczne = false;

    answers.strefaPrywatna = true;
    answers.strefaOtwarta = true;
    answers.komunikacja = true;
    answers.liczbaSypialniDodatkowych = 5;
    answers.liczbaPomieszczenWilgotnych = 4;
    answers.liczbaPozostalychPomieszczen = 1;
    answers.iloscGarazy = 1;

    answers.jestKominek = false;
    answers.jestGaz = true;
    answers.planujeRolety = true;
    answers.liczbaRolet = 8;
    answers.sterowanieOgrodem = true;
    answers.scenyOswietleniowe = true;
    answers.sterowanieTemperatura = true;
    answers.alarmIKontrolaDostepu = true;

    answers.ledySciemniane = 18;
    answers.czyCzujkiRecznie = true;
    answers.iloscCzujekLoxone = 24;
    answers.iloscCzujekSatel = 6;
    answers.iloscCzujekBezpieczenstwa = 6;
    answers.satelWOptimum = false;
    answers.strefyOgrzewaniaPodlogowego = 14;
    answers.iloscGrzejnikowSterowanych = 0;
    answers.iloscOswietlenZewnetrznych = 4;
    answers.iloscSekcjiPodlewania = 4;

    answers.trudnyKlientWspolczynnik = 1.2;
    answers.wspolczynnikOutdoor = 1.5;

    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const net = (category: string) => totals.functional.find((entry) => entry.category === category)?.net;

    // Oświetlenie: w realnym pliku CRM!O4 ("obwody ośw. ON/OFF") było ręcznie nadpisane na 36
    // zamiast wartości z formuły (30 dla tych parametrów pomieszczeń) — silnik poprawnie liczy
    // z formuły źródłowej (27683.76), różnica od PDF (29585.40) to wyłącznie ten ręczny override,
    // niemożliwy do odtworzenia z samych odpowiedzi ankiety.
    expect(net("oswietlenie")).toBe(27683.76);
    expect(net("bezpieczenstwo")).toBe(19548.66);
    expect(net("temperatura")).toBe(15483.83); // Excel (bez zaokrągleń pośrednich) daje 15483.828 — silnik zaokrągla do groszy na każdym etapie
    expect(net("rolety")).toBe(5243.28);
    expect(net("zewnetrzne")).toBe(8941.5);
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
    answers.iloscGarazy = 2;
    const items = calculateElectricalItems(answers, DEFAULT_CALCULATOR_SETTINGS);
    const doplata = items.find((entry) => entry.key === "doplata_brama_garazowa");
    expect(doplata?.net).toBe(324);
  });

  it("przyciski szklane (PRESTIŻ) i ręcznie nadpisane plastikowe (NORMAL) liczone ilość × cena z ustawień", () => {
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

  it("przyciski plastikowe (NORMAL) domyślnie auto-liczone z pomieszczeń jak CRM!O7 (gdy ilość nie nadpisana ręcznie)", () => {
    const answers = emptyCalculatorAnswers();
    answers.strefaPrywatna = true; // +2
    answers.strefaOtwarta = true; // +3
    answers.komunikacja = true; // +2
    answers.liczbaSypialniDodatkowych = 2; // +4
    answers.liczbaPomieszczenWilgotnych = 1; // +1
    answers.liczbaPozostalychPomieszczen = 1; // +1
    answers.iloscGarazy = 1; // +1
    const items = calculateElectricalItems(answers, DEFAULT_CALCULATOR_SETTINGS);
    const normal = items.find((entry) => entry.key === "przyciski_normal");
    expect(normal?.quantity).toBe(14);
    expect(normal?.net).toBe(14 * DEFAULT_CALCULATOR_SETTINGS.extras.cenaPrzyciskuNormal);
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

  it("trudny klient (>1,0) mnoży tylko kategorie funkcjonalne (per kategoria, jak WSP_SZEFA_1 w źródle), nie bazę systemu/elektrykę/inne systemy", () => {
    const answers = emptyCalculatorAnswers();
    answers.alarmIKontrolaDostepu = true;
    const base = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const trudny = calculateCalculatorTotals({ ...answers, trudnyKlientWspolczynnik: 1.2 }, DEFAULT_CALCULATOR_SETTINGS);

    expect(trudny.functionalNet).toBeCloseTo(base.functionalNet * 1.2, 0);
    expect(trudny.baseSystem.totalNet).toBe(base.baseSystem.totalNet);
    expect(trudny.mainNet).toBeCloseTo(trudny.baseSystem.totalNet + trudny.functionalNet + trudny.addonsNet, 2);
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

  it("stacja dokująca i iPad to stała ilość 1 (zweryfikowane — DANE!T89/T90 nie skalują się żadną ilością)", () => {
    const answers = emptyCalculatorAnswers();
    answers.addons.stacjaDokujacaIpad = true;
    answers.addons.ipad = true;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);

    const stacja = totals.addons.find((item) => item.key === "stacjaDokujacaIpad");
    const ipad = totals.addons.find((item) => item.key === "ipad");
    expect(stacja?.net).toBe(1462.8);
    expect(ipad?.net).toBe(2925.6);
  });

  it("dodatki BOM — realny przykład oferty klienta, suma dodatków zgodna z DANE!T118 (38616.48 zł)", () => {
    const answers = emptyCalculatorAnswers();
    answers.trudnyKlientWspolczynnik = 1.2;
    answers.liczbaOkienOtwieranych = 10;
    answers.czyOknaCzujnikiFabryczne = false;
    answers.liczbaDrzwiWejsciowych = 1;
    answers.liczbaRolet = 8;

    answers.addons.stacjaPogodowa = true;
    answers.addons.czujnikiOtwarciaOkien = true;
    answers.addons.przygotowanieDostepuDrzwi = true;
    answers.iloscElektrozaczepow = 2;
    answers.addons.klawiaturyNfc = true;
    answers.iloscKlawiaturNfc = 4;
    answers.addons.oswietlenieAwaryjne = true;
    answers.addons.bezpieczenstwoPlusPlusPlus = true;
    answers.addons.oswietlenieSciemniane230V = true;
    answers.iloscOswSciemniane = 4;
    answers.addons.stacjaDokujacaIpad = true;
    answers.addons.ipad = true;
    answers.addons.integracjeZInnymiSystemami = true;
    answers.integracjaKlimatyzacja = true;
    answers.integracjaWentylacja = false;
    answers.integracjaRekuperacja = true;
    answers.integracjaPompaCiepla = true;
    answers.addons.dodatkowyLicznikPradu = true;

    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    expect(totals.addonsNet).toBe(38616.48);
  });

  it("dodatki premium (gwarancje/dokumentacja) — bez współczynnika trudny klient, zgodne z DANE!T120 (3000 zł)", () => {
    const answers = emptyCalculatorAnswers();
    answers.trudnyKlientWspolczynnik = 1.2; // nie powinien dotknąć tych pozycji
    answers.addons.dokumentacjaPowykonawcza = true; // 0 zł, zawsze "w cenie"
    answers.addons.ustaleniaZInnymiBranzami = true; // 3000 zł
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);

    const dokumentacja = totals.addons.find((item) => item.key === "dokumentacjaPowykonawcza");
    const ustalenia = totals.addons.find((item) => item.key === "ustaleniaZInnymiBranzami");
    expect(dokumentacja?.net).toBe(0);
    expect(ustalenia?.net).toBe(3000);
    expect(totals.addonsNet).toBe(3000);
  });

  it("czujniki otwarcia okien — cena zależy od tego, czy okna mają fabryczne czujniki (ZESTAWIENIE!F36: 270 zł standard / 120 zł fabryczne)", () => {
    const answers = emptyCalculatorAnswers();
    answers.addons.czujnikiOtwarciaOkien = true;
    answers.liczbaOkienOtwieranych = 10;

    const standard = calculateAddons({ ...answers, czyOknaCzujnikiFabryczne: false }, DEFAULT_CALCULATOR_SETTINGS);
    const fabryczne = calculateAddons({ ...answers, czyOknaCzujnikiFabryczne: true }, DEFAULT_CALCULATOR_SETTINGS);

    expect(standard.find((item) => item.key === "czujnikiOtwarciaOkien")?.net).toBe(2700);
    expect(fabryczne.find((item) => item.key === "czujnikiOtwarciaOkien")?.net).toBe(1200);
  });

  it("sauna (Inne systemy) — cena stała 5430 zł (InneSystemy!V13, kolumna OPTIMUM)", () => {
    const answers = emptyCalculatorAnswers();
    answers.otherSystems.sauna = true;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const item = totals.otherSystems.items.find((entry) => entry.key === "sauna");
    expect(item?.net).toBe(5430);
  });
});
