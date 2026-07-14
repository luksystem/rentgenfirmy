import { describe, expect, it } from "vitest";
import { countUnacknowledgedAlarms, flattenActiveAlarms } from "@/lib/viz/alarm-display";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

function makeSnapshot(partial: Partial<VizStoreLiveSnapshot> & Pick<VizStoreLiveSnapshot, "projectId">) {
  return {
    clientId: null,
    displayName: "Sklep",
    projectName: "Sklep",
    clientAddress: null,
    latOverride: null,
    lngOverride: null,
    status: { code: "alarm", label: "Alarm", tone: "critical" },
    roles: {},
    openServiceRequests: 0,
    lastReadAt: null,
    workInProgress: false,
    activeAlarms: [],
    ...partial,
  } satisfies VizStoreLiveSnapshot;
}

describe("alarm-display", () => {
  it("flattens active alarms with store metadata", () => {
    const snapshots = [
      makeSnapshot({
        projectId: "p1",
        activeAlarms: [
          {
            ruleId: "r1",
            ruleName: "Za gorąco",
            severity: "alarm",
            roleCode: "store_temperature",
            numericValue: 30,
            thresholdNumeric: 28,
            condition: "gt",
          },
        ],
      }),
    ];

    expect(flattenActiveAlarms(snapshots)).toHaveLength(1);
    expect(flattenActiveAlarms(snapshots)[0]?.projectId).toBe("p1");
  });

  it("counts unacknowledged rule and telemetry alarms", () => {
    const snapshots = [
      makeSnapshot({
        projectId: "p1",
        activeAlarms: [
          {
            ruleId: "r1",
            ruleName: "Za gorąco",
            severity: "alarm",
            roleCode: "store_temperature",
            numericValue: 30,
            thresholdNumeric: 28,
            condition: "gt",
          },
        ],
      }),
      makeSnapshot({
        projectId: "p2",
        activeAlarms: [
          {
            ruleId: "r2",
            ruleName: "Za zimno",
            severity: "warning",
            roleCode: "store_temperature",
            numericValue: 15,
            thresholdNumeric: 18,
            condition: "lt",
            acknowledgement: {
              id: "a1",
              dashboardId: "d1",
              projectId: "p2",
              ruleId: "r2",
              acknowledgedBy: "u1",
              acknowledgedAt: "2026-01-01T00:00:00.000Z",
              note: null,
            },
          },
        ],
      }),
      makeSnapshot({
        projectId: "p3",
        roles: {
          active_alarm_count: {
            displayValue: "2",
            dataQuality: "valid",
            measuredAt: null,
            numericValue: 2,
          },
        },
      }),
    ];

    expect(countUnacknowledgedAlarms(snapshots)).toBe(2);
  });
});
