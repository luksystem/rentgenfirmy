import { describe, expect, it } from "vitest";
import {
  bucketMeasuredAt,
  buildChartAxisPlan,
  buildMultiSeriesRows,
  filterHistoryPoints,
  resolveChartBucketMs,
} from "@/lib/viz/chart-series";
import { normalizeChartConfig } from "@/lib/viz/chart-types";
import type { VizHistoryPoint } from "@/lib/viz/chart-types";

describe("chart-series", () => {
  const points: VizHistoryPoint[] = [
    {
      measuredAt: "2026-01-01T10:00:00.000Z",
      numericValue: 22,
      textValue: null,
      dataQuality: "valid",
      projectId: "p1",
      projectLabel: "DOM",
      roleCode: "store_temperature",
    },
    {
      measuredAt: "2026-01-01T10:00:00.000Z",
      numericValue: 24,
      textValue: null,
      dataQuality: "valid",
      projectId: "p2",
      projectLabel: "Kingi",
      roleCode: "store_temperature",
    },
    {
      measuredAt: "2026-01-01T10:00:00.000Z",
      numericValue: 21,
      textValue: null,
      dataQuality: "valid",
      projectId: "p1",
      projectLabel: "DOM",
      roleCode: "store_setpoint",
    },
  ];

  it("builds separate colored series per store and variable", () => {
    const rows = buildMultiSeriesRows(points);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.["DOM · store_temperature"]).toBe(22);
    expect(rows[0]?.["Kingi · store_temperature"]).toBe(24);
    expect(rows[0]?.["DOM · store_setpoint"]).toBe(21);
  });

  it("filters points by enabled stores and roles", () => {
    const filtered = filterHistoryPoints(
      points,
      new Set(["p1"]),
      new Set(["store_setpoint"]),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.roleCode).toBe("store_setpoint");
  });

  it("aligns multiple stores into shared time buckets", () => {
    const bucketMs = resolveChartBucketMs(24);
    const rows = buildMultiSeriesRows(
      [
        {
          measuredAt: "2026-01-01T10:02:00.000Z",
          numericValue: 22,
          textValue: null,
          dataQuality: "valid",
          projectId: "p1",
          projectLabel: "DOM",
          roleCode: "store_temperature",
        },
        {
          measuredAt: "2026-01-01T10:13:00.000Z",
          numericValue: 24,
          textValue: null,
          dataQuality: "valid",
          projectId: "p2",
          projectLabel: "Kingi",
          roleCode: "store_temperature",
        },
      ],
      undefined,
      24,
    );

    expect(rows).toHaveLength(1);
    expect(bucketMeasuredAt("2026-01-01T10:02:00.000Z", bucketMs)).toBe(
      bucketMeasuredAt("2026-01-01T10:13:00.000Z", bucketMs),
    );
    expect(rows[0]?.["DOM · store_temperature"]).toBe(22);
    expect(rows[0]?.["Kingi · store_temperature"]).toBe(24);
  });

  it("assigns dual axis when units differ", () => {
    const roleNameByCode = new Map([
      ["store_temperature", "Temperatura sklepu"],
      ["energy_total", "Energia całkowita"],
    ]);
    const roleUnitByCode = new Map([
      ["store_temperature", "°C"],
      ["energy_total", "kWh"],
    ]);
    const plan = buildChartAxisPlan({
      seriesKeys: ["DOM · Temperatura sklepu", "DOM · Energia całkowita"],
      roleNameByCode,
      roleUnitByCode,
    });
    expect(plan.dualAxis).toBe(true);
    expect(plan.leftUnit).toBe("°C");
    expect(plan.rightUnit).toBe("kWh");
  });
});

describe("normalizeChartConfig", () => {
  it("migrates legacy roleCode to roleCodes", () => {
    const config = normalizeChartConfig({
      roleCode: "store_setpoint",
      projectIds: ["p1"],
    });
    expect(config.roleCodes).toEqual(["store_setpoint"]);
  });
});
