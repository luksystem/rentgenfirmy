import { describe, expect, it } from "vitest";
import { aggregateEnergyFromSnapshots } from "@/lib/viz/energy-kpi";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

function snapshot(energyTotal: number | null, energyPeriod: number | null = null): VizStoreLiveSnapshot {
  return {
    projectId: "p1",
    clientId: null,
    displayName: "Sklep",
    projectName: "Sklep",
    clientAddress: null,
    latOverride: null,
    lngOverride: null,
    status: { code: "ok", label: "OK", tone: "active" },
    roles: {
      ...(energyTotal != null
        ? {
            energy_total: {
              displayValue: String(energyTotal),
              dataQuality: "valid" as const,
              measuredAt: "2026-07-01T10:00:00Z",
              numericValue: energyTotal,
            },
          }
        : {}),
      ...(energyPeriod != null
        ? {
            energy_current_period: {
              displayValue: String(energyPeriod),
              dataQuality: "valid" as const,
              measuredAt: "2026-07-01T10:00:00Z",
              numericValue: energyPeriod,
            },
          }
        : {}),
    },
    openServiceRequests: 0,
    lastReadAt: null,
    workInProgress: false,
    activeAlarms: [],
  };
}

describe("aggregateEnergyFromSnapshots", () => {
  it("sums energy_total across stores", () => {
    const result = aggregateEnergyFromSnapshots([
      snapshot(1000),
      snapshot(2500),
    ]);
    expect(result.storesWithEnergyReading).toBe(2);
    expect(result.totalEnergyKwh).toBe(3500);
    expect(result.avgEnergyKwh).toBe(1750);
  });

  it("falls back to energy_current_period when total missing", () => {
    const result = aggregateEnergyFromSnapshots([snapshot(null, 420)]);
    expect(result.totalEnergyKwh).toBe(420);
  });

  it("returns null totals when no readings", () => {
    const result = aggregateEnergyFromSnapshots([snapshot(null)]);
    expect(result.storesWithEnergyReading).toBe(0);
    expect(result.totalEnergyKwh).toBeNull();
  });
});
