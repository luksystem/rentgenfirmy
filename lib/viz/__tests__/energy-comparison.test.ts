import { describe, expect, it } from "vitest";
import { buildEnergyComparisons, buildEnergyTrend } from "@/lib/viz/energy-comparison";
import { mergeEnergyFields, parseEnergyFieldsFromPdfText } from "@/lib/viz/energy-invoice-extract";
import type { VizEnergyInvoice } from "@/lib/viz/energy-types";

function invoice(overrides: Partial<VizEnergyInvoice>): VizEnergyInvoice {
  return {
    id: "inv-1",
    dashboardId: "dash",
    projectId: "proj",
    documentId: "doc",
    documentTitle: "Faktura",
    documentFileName: "f.pdf",
    documentUrl: null,
    billingPeriodStart: "2026-05-01",
    billingPeriodEnd: "2026-05-31",
    totalKwh: 1000,
    totalCostPln: 1200,
    supplierName: "PGE",
    analysisStatus: "completed",
    analysis: null,
    analyzedAt: null,
    uploadedByName: "Test",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
    ...overrides,
  };
}

describe("parseEnergyFieldsFromPdfText", () => {
  it("extracts kWh and PLN from typical invoice text", () => {
    const parsed = parseEnergyFieldsFromPdfText(
      "PGE Dystrybucja. Okres 01.05.2026 - 31.05.2026. Zużycie 1 234,5 kWh. Do zapłaty 1 850,00 PLN",
    );
    expect(parsed.totalKwh).toBe(1234.5);
    expect(parsed.totalCostPln).toBe(1850);
    expect(parsed.supplierName).toBe("PGE");
    expect(parsed.billingPeriodStart).toBe("2026-05-01");
    expect(parsed.billingPeriodEnd).toBe("2026-05-31");
  });
});

describe("buildEnergyTrend", () => {
  it("builds comparisons between two periods", () => {
    const trend = buildEnergyTrend([
      invoice({ id: "a", billingPeriodEnd: "2026-04-30", totalKwh: 900, totalCostPln: 1000 }),
      invoice({ id: "b", billingPeriodEnd: "2026-05-31", totalKwh: 1100, totalCostPln: 1300 }),
    ]);
    expect(trend).toHaveLength(2);

    const comparisons = buildEnergyComparisons([
      invoice({ id: "a", billingPeriodEnd: "2026-04-30", totalKwh: 900, totalCostPln: 1000 }),
      invoice({ id: "b", billingPeriodEnd: "2026-05-31", totalKwh: 1100, totalCostPln: 1300 }),
    ]);
    expect(comparisons[0]?.kwhChangePercent).toBeCloseTo(22.22, 1);
  });

  it("merges manual and pdf fields with manual priority", () => {
    const merged = mergeEnergyFields(
      { totalKwh: 500, totalCostPln: null, billingPeriodStart: null, billingPeriodEnd: null, supplierName: null },
      { totalKwh: 999, totalCostPln: 700, billingPeriodStart: "2026-01-01", billingPeriodEnd: "2026-01-31", supplierName: "Enea" },
    );
    expect(merged.totalKwh).toBe(500);
    expect(merged.totalCostPln).toBe(700);
    expect(merged.supplierName).toBe("Enea");
  });
});
