// Wymuszamy UTC, żeby new Date(rok, miesiąc, dzień) + toISODate (oparte na toISOString)
// dawały deterministyczne wyniki niezależnie od strefy czasowej maszyny uruchamiającej testy.
process.env.TZ = "UTC";

import { describe, expect, it } from "vitest";
import { resolveComparisonWindow } from "@/lib/report-kpi/kpi-engine";

describe("resolveComparisonWindow", () => {
  it("day: bieżący i poprzedni dzień to pojedyncze daty", () => {
    const asOf = new Date(2026, 6, 24); // 2026-07-24 (piątek)
    const { current, previous } = resolveComparisonWindow(asOf, "day");
    expect(current).toEqual({ mode: "custom", startDate: "2026-07-24", endDate: "2026-07-24" });
    expect(previous).toEqual({ mode: "custom", startDate: "2026-07-23", endDate: "2026-07-23" });
  });

  it("week: bieżący tydzień to 7 dni kończących się w asOf, poprzedni to kolejne 7 dni wstecz", () => {
    const asOf = new Date(2026, 6, 24);
    const { current, previous } = resolveComparisonWindow(asOf, "week");
    expect(current).toEqual({ mode: "weekly", startDate: "2026-07-18", endDate: "2026-07-24" });
    expect(previous).toEqual({ mode: "weekly", startDate: "2026-07-11", endDate: "2026-07-17" });
  });

  it("month: poprzedni miesiąc to ten sam dzień-do-miesiąca w miesiącu kalendarzowym wcześniej", () => {
    const asOf = new Date(2026, 6, 24); // lipiec
    const { current, previous } = resolveComparisonWindow(asOf, "month");
    expect(current).toEqual({ mode: "custom", startDate: "2026-07-01", endDate: "2026-07-24" });
    expect(previous).toEqual({ mode: "custom", startDate: "2026-06-01", endDate: "2026-06-24" });
  });

  it("month: przycina dzień do długości krótszego miesiąca docelowego (31 -> 28/29)", () => {
    const asOf = new Date(2026, 2, 31); // 31 marca 2026 (nie przestępny)
    const { previous } = resolveComparisonWindow(asOf, "month");
    expect(previous).toEqual({ mode: "custom", startDate: "2026-02-01", endDate: "2026-02-28" });
  });

  it("month: rok przestępny - luty ma 29 dni", () => {
    const asOf = new Date(2024, 2, 31); // 31 marca 2024 (przestępny)
    const { previous } = resolveComparisonWindow(asOf, "month");
    expect(previous).toEqual({ mode: "custom", startDate: "2024-02-01", endDate: "2024-02-29" });
  });

  it("quarter: poprzedni kwartał zaczyna się 3 miesiące wcześniej", () => {
    const asOf = new Date(2026, 6, 24); // Q3 2026 (lipiec-wrzesień)
    const { current, previous } = resolveComparisonWindow(asOf, "quarter");
    expect(current).toEqual({ mode: "custom", startDate: "2026-07-01", endDate: "2026-07-24" });
    expect(previous).toEqual({ mode: "custom", startDate: "2026-04-01", endDate: "2026-04-24" });
  });

  it("quarter: przejście przez granicę roku (Q1 -> Q4 poprzedniego roku)", () => {
    const asOf = new Date(2026, 1, 15); // 15 lutego 2026 -> Q1
    const { previous } = resolveComparisonWindow(asOf, "quarter");
    expect(previous).toEqual({ mode: "custom", startDate: "2025-10-01", endDate: "2025-11-15" });
  });

  it("year: poprzedni rok to ten sam dzień roku wcześniej", () => {
    const asOf = new Date(2026, 6, 24);
    const { current, previous } = resolveComparisonWindow(asOf, "year");
    expect(current).toEqual({ mode: "custom", startDate: "2026-01-01", endDate: "2026-07-24" });
    expect(previous).toEqual({ mode: "custom", startDate: "2025-01-01", endDate: "2025-07-24" });
  });

  it("year: 29 lutego roku przestępnego przycina się do 28 lutego rok wcześniej", () => {
    const asOf = new Date(2024, 1, 29);
    const { previous } = resolveComparisonWindow(asOf, "year");
    expect(previous).toEqual({ mode: "custom", startDate: "2023-01-01", endDate: "2023-02-28" });
  });
});
