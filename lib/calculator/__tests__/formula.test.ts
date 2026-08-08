import { describe, expect, it } from "vitest";
import { evaluateFormula, extractFormulaVariables, FormulaError, validateFormula } from "@/lib/calculator/formula";

describe("evaluateFormula — arytmetyka i precedencja", () => {
  it("podstawowe operatory i precedencja mnożenia nad dodawaniem", () => {
    expect(evaluateFormula("2 + 3 * 4", {})).toBe(14);
    expect(evaluateFormula("(2 + 3) * 4", {})).toBe(20);
    expect(evaluateFormula("10 / 4", {})).toBe(2.5);
    expect(evaluateFormula("2 ^ 3", {})).toBe(8);
  });

  it("dzielenie przez zero daje 0, nie NaN/Infinity", () => {
    expect(evaluateFormula("10 / 0", {})).toBe(0);
  });

  it("liczby ujemne i jednoargumentowy minus", () => {
    expect(evaluateFormula("-5 + 3", {})).toBe(-2);
    expect(evaluateFormula("3 - -5", {})).toBe(8);
  });

  it("zmienne ze scope", () => {
    expect(evaluateFormula("kondygnacje * 2 + odleglosc", { kondygnacje: 3, odleglosc: 10 })).toBe(16);
  });

  it("nieznana zmienna rzuca FormulaError z czytelnym komunikatem", () => {
    expect(() => evaluateFormula("brakujacaZmienna + 1", {})).toThrow(FormulaError);
    try {
      evaluateFormula("brakujacaZmienna + 1", {});
    } catch (error) {
      expect(error).toBeInstanceOf(FormulaError);
      expect((error as FormulaError).message).toContain("brakujacaZmienna");
    }
  });
});

describe("evaluateFormula — porównania i logika", () => {
  it("operatory porównania zwracają 1/0", () => {
    expect(evaluateFormula("3 > 2", {})).toBe(1);
    expect(evaluateFormula("3 < 2", {})).toBe(0);
    expect(evaluateFormula("3 >= 3", {})).toBe(1);
    expect(evaluateFormula("3 <> 3", {})).toBe(0);
    expect(evaluateFormula("3 = 3", {})).toBe(1);
  });

  it("AND/OR/NOT jak w Excelu", () => {
    expect(evaluateFormula("AND(1; 1; 1)", {})).toBe(1);
    expect(evaluateFormula("AND(1; 0; 1)", {})).toBe(0);
    expect(evaluateFormula("OR(0; 0; 1)", {})).toBe(1);
    expect(evaluateFormula("NOT(0)", {})).toBe(1);
  });
});

describe("evaluateFormula — IF i funkcje zaokrągleń (jak w kalkulatorze)", () => {
  it("IF wybiera odpowiednią gałąź, zagnieżdżone IF działają", () => {
    expect(evaluateFormula("IF(kondygnacje > 1; 1500; 2500)", { kondygnacje: 2 })).toBe(1500);
    expect(evaluateFormula("IF(kondygnacje > 1; 1500; 2500)", { kondygnacje: 1 })).toBe(2500);
    expect(
      evaluateFormula("IF(punkty < 300; 6000; IF(punkty < 600; 9000; 10500))", { punkty: 700 }),
    ).toBe(10500);
    expect(
      evaluateFormula("IF(punkty < 300; 6000; IF(punkty < 600; 9000; 10500))", { punkty: 400 }),
    ).toBe(9000);
  });

  it("ROUNDUP/ROUND/ROUNDDOWN zgodne z semantyką Excela", () => {
    expect(evaluateFormula("ROUNDUP(ledy / 4; 0)", { ledy: 9 })).toBe(3);
    expect(evaluateFormula("ROUNDUP(ledy / 4)", { ledy: 9 })).toBe(3);
    expect(evaluateFormula("ROUND(2.345; 2)", {})).toBeCloseTo(2.35, 2);
    expect(evaluateFormula("ROUNDDOWN(2.99; 0)", {})).toBe(2);
  });

  it("odtwarza rzeczywistą formułę bazy zasilania (wstępna konfiguracja) 1:1", () => {
    const formula = "IF(kondygnacje > 1; 1500; 2500) * wspRozdzielnica";
    expect(evaluateFormula(formula, { kondygnacje: 3, wspRozdzielnica: 1 })).toBe(1500);
    expect(evaluateFormula(formula, { kondygnacje: 1, wspRozdzielnica: 1.2 })).toBe(3000);
  });

  it("MAX/MIN/ABS", () => {
    expect(evaluateFormula("MAX(1; 5; 3)", {})).toBe(5);
    expect(evaluateFormula("MIN(1; 5; 3)", {})).toBe(1);
    expect(evaluateFormula("ABS(-7)", {})).toBe(7);
  });
});

describe("evaluateFormula — błędy składni", () => {
  it("niedomknięty nawias rzuca FormulaError", () => {
    expect(() => evaluateFormula("(1 + 2", {})).toThrow(FormulaError);
  });
  it("nieznana funkcja rzuca FormulaError", () => {
    expect(() => evaluateFormula("ZLASOWANA(1)", {})).toThrow(FormulaError);
  });
  it("zła liczba argumentów funkcji rzuca FormulaError", () => {
    expect(() => evaluateFormula("IF(1; 2)", {})).toThrow(FormulaError);
  });
  it("nieoczekiwane znaki na końcu formuły rzucają błąd", () => {
    expect(() => evaluateFormula("1 + 2 3", {})).toThrow(FormulaError);
  });
});

describe("extractFormulaVariables / validateFormula", () => {
  it("wyciąga unikalne nazwy zmiennych, pomija nazwy funkcji", () => {
    const vars = extractFormulaVariables("IF(kondygnacje > 1; a * 2; b + kondygnacje)");
    expect(vars.sort()).toEqual(["a", "b", "kondygnacje"]);
  });

  it("validateFormula zwraca null gdy wszystkie zmienne znane", () => {
    expect(validateFormula("a + b", new Set(["a", "b"]))).toBeNull();
  });

  it("validateFormula zgłasza nieznane zmienne po nazwie", () => {
    expect(validateFormula("a + c", new Set(["a", "b"]))).toContain("c");
  });

  it("validateFormula zgłasza błąd składni jako komunikat, nie wyjątek", () => {
    const result = validateFormula("(1 +", new Set());
    expect(typeof result).toBe("string");
  });
});
