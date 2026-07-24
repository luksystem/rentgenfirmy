import { describe, expect, it } from "vitest";
import { evaluateDeltaTone, evaluateSeverity, worstSeverity } from "@/lib/report-kpi/severity";
import type { TrendComparison } from "@/lib/types";

function trend(direction: TrendComparison["direction"]): TrendComparison {
  const delta = direction === "up" ? 1 : direction === "down" ? -1 : 0;
  return { current: 5 + delta, previous: 5, delta, direction, percentChange: null };
}

describe("evaluateSeverity", () => {
  it("good gdy poniżej progu ostrzegawczego", () => {
    expect(evaluateSeverity(3, 5, 10)).toBe("good");
  });

  it("warning gdy na progu ostrzegawczym lub powyżej, poniżej krytycznego", () => {
    expect(evaluateSeverity(5, 5, 10)).toBe("warning");
    expect(evaluateSeverity(9, 5, 10)).toBe("warning");
  });

  it("critical gdy na progu krytycznym lub powyżej", () => {
    expect(evaluateSeverity(10, 5, 10)).toBe("critical");
    expect(evaluateSeverity(100, 5, 10)).toBe("critical");
  });

  it("oba progi null -> zawsze good, niezależnie od wartości", () => {
    expect(evaluateSeverity(1_000_000, null, null)).toBe("good");
  });

  it("tylko próg krytyczny ustawiony -> nie ma stanu warning", () => {
    expect(evaluateSeverity(4, null, 10)).toBe("good");
    expect(evaluateSeverity(10, null, 10)).toBe("critical");
  });
});

describe("evaluateDeltaTone", () => {
  it("increase-is-bad: wzrost = bad, spadek = good", () => {
    expect(evaluateDeltaTone(trend("up"), "increase-is-bad")).toBe("bad");
    expect(evaluateDeltaTone(trend("down"), "increase-is-bad")).toBe("good");
  });

  it("increase-is-good: wzrost = good, spadek = bad", () => {
    expect(evaluateDeltaTone(trend("up"), "increase-is-good")).toBe("good");
    expect(evaluateDeltaTone(trend("down"), "increase-is-good")).toBe("bad");
  });

  it("brak zmiany -> zawsze neutral, niezależnie od polaryzacji", () => {
    expect(evaluateDeltaTone(trend("same"), "increase-is-bad")).toBe("neutral");
    expect(evaluateDeltaTone(trend("same"), "increase-is-good")).toBe("neutral");
  });
});

describe("worstSeverity", () => {
  it("critical wygrywa nad warning i good", () => {
    expect(worstSeverity(["good", "warning", "critical"])).toBe("critical");
  });

  it("warning wygrywa nad good", () => {
    expect(worstSeverity(["good", "good", "warning"])).toBe("warning");
  });

  it("same good -> good", () => {
    expect(worstSeverity(["good", "good"])).toBe("good");
  });

  it("pusta lista -> good (brak sygnału = brak problemu)", () => {
    expect(worstSeverity([])).toBe("good");
  });
});
