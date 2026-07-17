import { describe, expect, it } from "vitest";
import { resolveChartTimeRange } from "@/lib/viz/chart-time-range";

describe("resolveChartTimeRange", () => {
  const now = new Date("2026-07-17T12:00:00.000Z").getTime();

  it("uses relative periodHours by default", () => {
    const range = resolveChartTimeRange({ periodHours: 24 }, now);
    expect(range.endAt).toBe(new Date(now).toISOString());
    expect(range.startAt).toBe(new Date(now - 24 * 60 * 60 * 1000).toISOString());
  });

  it("uses absolute startAt/endAt when configured", () => {
    const range = resolveChartTimeRange(
      {
        dateRangeMode: "absolute",
        periodHours: 24,
        startAt: "2026-07-01T00:00:00.000Z",
        endAt: "2026-07-07T23:59:00.000Z",
      },
      now,
    );
    expect(range.startAt).toBe("2026-07-01T00:00:00.000Z");
    expect(range.endAt).toBe("2026-07-07T23:59:00.000Z");
  });
});
