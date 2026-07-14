import { describe, expect, it } from "vitest";
import { analyzeEnergyInvoice } from "@/lib/ai/viz-energy-invoice-analyzer";

describe("analyzeEnergyInvoice", () => {
  it("returns rule-based analysis when OpenAI key is absent", async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const analysis = await analyzeEnergyInvoice({
      title: "Faktura PGE 05/2026",
      totalKwh: 12000,
      totalCostPln: 18000,
      supplierName: "PGE",
      billingPeriodStart: "2026-05-01",
      billingPeriodEnd: "2026-05-31",
    });

    expect(analysis.provider).toBe("rules");
    expect(analysis.summary).toContain("PGE");
    expect(analysis.anomalies.length).toBeGreaterThan(0);

    if (original) {
      process.env.OPENAI_API_KEY = original;
    }
  });
});
