import { describe, expect, it } from "vitest";
import { formatMappedValue, resolveVizStoreStatus } from "@/lib/viz/store-status";

describe("resolveVizStoreStatus", () => {
  it("returns unconfigured when no mappings", () => {
    expect(resolveVizStoreStatus({ hasMappings: false, miniserverOnline: null, dataQuality: null, activeAlarmCount: null, systemErrorCount: null, openServiceRequests: 0, workInProgress: false, staleMinutes: null }).code).toBe("unconfigured");
  });

  it("prioritizes communication loss over warnings", () => {
    expect(
      resolveVizStoreStatus({
        hasMappings: true,
        miniserverOnline: false,
        dataQuality: "valid",
        activeAlarmCount: 0,
        systemErrorCount: 0,
        openServiceRequests: 2,
        workInProgress: false,
        staleMinutes: 1,
      }).code,
    ).toBe("no_communication");
  });

  it("returns alarm when active alarms exist", () => {
    expect(
      resolveVizStoreStatus({
        hasMappings: true,
        miniserverOnline: true,
        dataQuality: "valid",
        activeAlarmCount: 2,
        systemErrorCount: 0,
        openServiceRequests: 0,
        workInProgress: false,
        staleMinutes: 1,
      }).code,
    ).toBe("alarm");
  });
});

describe("formatMappedValue", () => {
  it("shows dash for missing data", () => {
    expect(formatMappedValue(null, null)).toBe("—");
  });

  it("applies multiplier and unit", () => {
    expect(
      formatMappedValue(20, null, { multiplier: 1, offsetValue: 0.5, unit: "°C", decimalPlaces: 1 }),
    ).toBe("20.5 °C");
  });
});
