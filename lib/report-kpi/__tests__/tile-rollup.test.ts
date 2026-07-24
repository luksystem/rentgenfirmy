import { describe, expect, it } from "vitest";
import { computeTileSeverity, computeTileTrend } from "@/lib/report-kpi/tile-rollup";
import type { KpiResult, Severity } from "@/lib/report-kpi/types";

function kpi(severity: Severity, deltaTone: KpiResult["deltaTone"]): KpiResult {
  return {
    key: "test",
    label: "Test",
    value: 1,
    displayValue: "1",
    trend: deltaTone === "neutral" ? null : { current: 1, previous: 1, delta: 0, direction: "same", percentChange: 0 },
    severity,
    deltaTone,
  };
}

describe("computeTileSeverity", () => {
  it("najgorsza severity wygrywa", () => {
    expect(computeTileSeverity([kpi("good", "good"), kpi("critical", "bad")])).toBe("critical");
  });
});

describe("computeTileTrend", () => {
  it("dowolny critical+bad wygrywa remis nawet przy przewadze good", () => {
    const kpis = [kpi("good", "good"), kpi("good", "good"), kpi("critical", "bad")];
    expect(computeTileTrend(kpis)).toBe("worsening");
  });

  it("przewaga liczbowa bad -> worsening", () => {
    const kpis = [kpi("warning", "bad"), kpi("warning", "bad"), kpi("good", "good")];
    expect(computeTileTrend(kpis)).toBe("worsening");
  });

  it("przewaga liczbowa good -> improving", () => {
    const kpis = [kpi("good", "good"), kpi("good", "good"), kpi("warning", "bad")];
    expect(computeTileTrend(kpis)).toBe("improving");
  });

  it("remis good/bad bez critical -> stable", () => {
    const kpis = [kpi("warning", "bad"), kpi("good", "good")];
    expect(computeTileTrend(kpis)).toBe("stable");
  });

  it("brak KPI z trendem -> stable", () => {
    expect(computeTileTrend([kpi("good", "neutral")])).toBe("stable");
  });
});
