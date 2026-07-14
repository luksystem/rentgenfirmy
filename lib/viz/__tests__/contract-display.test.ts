import { describe, expect, it } from "vitest";
import { pickCurrentRateVersion } from "@/lib/viz/contract-display";
import type { VizServiceContractRateVersion } from "@/lib/viz/contract-types";
import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";

function version(validFrom: string, validUntil: string | null = null): VizServiceContractRateVersion {
  return {
    id: "v1",
    contractId: "c1",
    versionLabel: "Test",
    validFrom,
    validUntil,
    rates: DEFAULT_SERVICE_SETTINGS.rates,
    zoneSettings: DEFAULT_SERVICE_SETTINGS.zoneSettings,
    notes: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

describe("pickCurrentRateVersion", () => {
  it("picks version valid today", () => {
    const picked = pickCurrentRateVersion([
      version("2020-01-01", "2025-01-01"),
      version("2026-01-01"),
    ]);
    expect(picked?.validFrom).toBe("2026-01-01");
  });
});
