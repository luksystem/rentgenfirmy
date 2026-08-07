import { describe, expect, it } from "vitest";
import { calculateCalculatorTotals, estimateElectricalPoints, resolveHouseSizeTier } from "@/lib/calculator/engine";
import { DEFAULT_CALCULATOR_SETTINGS } from "@/lib/calculator/settings";
import { emptyCalculatorAnswers } from "@/lib/calculator/types";

/**
 * Weryfikacja silnika kalkulatora. Wartości startowe w `lib/calculator/settings.ts` zostały
 * przepisane z realnych, przeliczonych komórek pliku
 * "Oferta cenowa Luksystem INTELIGETNY DOM_Pakiety_v21.xlsx" (arkusze KALKULATOR/ZESTAWIENIE dla
 * ścieżki OPTIMUM, próg metrażowy 80-150 m²) — patrz komentarze w settings.ts. Tu sprawdzamy, że
 * transkrypcja się zgadza i że mechanika przeliczeń (progi, rabaty, proporcje) działa poprawnie —
 * nie da się odtworzyć pełnego uruchomienia arkusza Excela w tym środowisku, więc to najbliższe
 * dostępne potwierdzenie zgodności z liczbami źródłowymi.
 */

describe("resolveHouseSizeTier", () => {
  it("dzieli progi 80 / 150 m²", () => {
    expect(resolveHouseSizeTier({ powierzchniaM2: 60 })).toBe("do_80");
    expect(resolveHouseSizeTier({ powierzchniaM2: 80 })).toBe("do_80");
    expect(resolveHouseSizeTier({ powierzchniaM2: 120 })).toBe("od_80_do_150");
    expect(resolveHouseSizeTier({ powierzchniaM2: 150 })).toBe("od_80_do_150");
    expect(resolveHouseSizeTier({ powierzchniaM2: 200 })).toBe("od_150");
  });
});

describe("transkrypcja cen z arkusza (próg 80-150 m²)", () => {
  const settings = DEFAULT_CALCULATOR_SETTINGS;

  it("rozdzielnica sprzęt = KALKULATOR!D12 (7950)", () => {
    expect(settings.baseSystem.rozdzielnicaSprzet.od_80_do_150).toBe(7950);
  });

  it("automatyka baza = KALKULATOR!D19 (7350)", () => {
    expect(settings.baseSystem.automatykaBaza.od_80_do_150).toBe(7350);
  });

  it("kategorie funkcjonalne — poziom KOMFORT (ZESTAWIENIE!K72/P72/U72/Z72/AE72, zaokrąglone)", () => {
    expect(settings.functional.oswietlenie.komfort).toBe(7850);
    expect(settings.functional.bezpieczenstwo.komfort).toBe(9100);
    expect(settings.functional.zewnetrzne.komfort).toBe(5000);
  });
});

describe("calculateCalculatorTotals — mechanika przeliczeń", () => {
  it("dom bez żadnych opcji liczy tylko bazę systemu + kategorie na poziomie domyślnym", () => {
    const answers = emptyCalculatorAnswers();
    answers.powierzchniaM2 = 120;
    answers.liczbaDrzwiWejsciowych = 0; // domyślnie 1 (drzwi wejściowe zawsze są) -> tu celowo zerujemy dla czystego przypadku
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);

    expect(totals.addonsNet).toBe(0);
    expect(totals.otherSystems.selectedNet).toBe(0);
    expect(totals.electrical.net).toBe(0); // brak pomieszczeń/drzwi -> 0 punktów
    expect(totals.mainNet).toBe(totals.baseSystem.totalNet + totals.functionalNet);
    expect(totals.totalNet).toBe(totals.mainNet);
  });

  it("kompleksowa instalacja obniża cenę projektu i instalacji elektrycznej", () => {
    const base = emptyCalculatorAnswers();
    base.powierzchniaM2 = 120;
    base.strefaPrywatna = true;
    base.liczbaPunktowElektrycznychRecznie = 400;

    const withoutDiscount = calculateCalculatorTotals(base, DEFAULT_CALCULATOR_SETTINGS);
    const withDiscount = calculateCalculatorTotals(
      { ...base, kompleksowaInstalacja: true },
      DEFAULT_CALCULATOR_SETTINGS,
    );

    expect(withDiscount.baseSystem.projektDiscountNet).toBeGreaterThan(0);
    expect(withDiscount.electrical.discountNet).toBeGreaterThan(0);
    expect(withDiscount.totalNet).toBeLessThan(withoutDiscount.totalNet);
  });

  it("rabat na inne systemy jest proporcjonalny do liczby wybranych spośród wszystkich", () => {
    const answers = emptyCalculatorAnswers();
    answers.otherSystems.sieciLan = true;
    const totals = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);

    // 1 z 8 systemów -> 1/8 max rabatu (15% domyślnie), zaokrąglone do 2 miejsc jak reszta kwot/procentów w silniku
    expect(totals.otherSystems.discountPercent).toBeCloseTo((1 / 8) * 15, 2);
    expect(totals.otherSystems.discountNet).toBeCloseTo(
      totals.otherSystems.selectedNet * (totals.otherSystems.discountPercent / 100),
      2,
    );
  });

  it("trudny klient (>1,0) mnoży wartość główną, ale nie instalację elektryczną/inne systemy", () => {
    const answers = emptyCalculatorAnswers();
    answers.powierzchniaM2 = 100;
    const base = calculateCalculatorTotals(answers, DEFAULT_CALCULATOR_SETTINGS);
    const trudny = calculateCalculatorTotals(
      { ...answers, trudnyKlientWspolczynnik: 1.2 },
      DEFAULT_CALCULATOR_SETTINGS,
    );

    expect(trudny.mainNet).toBeCloseTo(base.mainNet * 1.2, 0);
  });

  it("płatność z góry obniża sumę końcową o skonfigurowany procent", () => {
    const answers = emptyCalculatorAnswers();
    answers.powierzchniaM2 = 100;
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

describe("estimateElectricalPoints", () => {
  it("ręczna wartość ma priorytet nad wyliczoną", () => {
    const answers = emptyCalculatorAnswers();
    answers.strefaPrywatna = true;
    answers.liczbaPunktowElektrycznychRecznie = 999;
    expect(estimateElectricalPoints(answers)).toBe(999);
  });

  it("bez ręcznej wartości liczy z parametrów pomieszczeń", () => {
    const answers = emptyCalculatorAnswers();
    answers.strefaPrywatna = true; // +2
    answers.strefaOtwarta = true; // +4
    expect(estimateElectricalPoints(answers)).toBeGreaterThan(0);
  });
});
