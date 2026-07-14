import { describe, expect, it } from "vitest";
import {
  pickTopExpansionSystem,
  resolveSystemCellStatus,
  summarizeSystemCoverage,
} from "@/lib/viz/systems-matrix";
import type { VizIntegratedSystem, VizProjectSystemStatus } from "@/lib/viz/types";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

const systems: VizIntegratedSystem[] = [
  {
    id: "sys-bms",
    code: "bms",
    name: "BMS",
    description: null,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "sys-pv",
    code: "pv",
    name: "PV",
    description: null,
    sortOrder: 1,
    isActive: true,
  },
];

function snapshot(projectId: string): VizStoreLiveSnapshot {
  return {
    projectId,
    clientId: null,
    displayName: projectId,
    projectName: projectId,
    clientAddress: null,
    latOverride: null,
    lngOverride: null,
    status: { code: "ok", label: "OK", tone: "active" },
    roles: {},
    openServiceRequests: 0,
    lastReadAt: null,
    workInProgress: false,
    activeAlarms: [],
  };
}

describe("systems-matrix", () => {
  it("defaults missing status to none", () => {
    expect(resolveSystemCellStatus("p1", "sys-bms", [])).toBe("none");
  });

  it("summarizes coverage and expansion potential", () => {
    const statuses: VizProjectSystemStatus[] = [
      {
        id: "1",
        dashboardId: "d1",
        projectId: "p1",
        systemId: "sys-bms",
        systemCode: "bms",
        systemName: "BMS",
        status: "integrated",
        integrationScope: null,
        notes: null,
        updatedAt: "2026-01-01",
      },
      {
        id: "2",
        dashboardId: "d1",
        projectId: "p2",
        systemId: "sys-bms",
        systemCode: "bms",
        systemName: "BMS",
        status: "planned",
        integrationScope: null,
        notes: null,
        updatedAt: "2026-01-01",
      },
      {
        id: "3",
        dashboardId: "d1",
        projectId: "p1",
        systemId: "sys-pv",
        systemCode: "pv",
        systemName: "PV",
        status: "possible",
        integrationScope: null,
        notes: null,
        updatedAt: "2026-01-01",
      },
    ];

    const summaries = summarizeSystemCoverage({
      systems,
      snapshots: [snapshot("p1"), snapshot("p2")],
      statuses,
    });

    expect(summaries[0]?.integratedCount).toBe(1);
    expect(summaries[0]?.expansionCount).toBe(1);
    expect(summaries[0]?.coveragePercent).toBe(50);
    expect(summaries[1]?.expansionCount).toBe(2);

    const top = pickTopExpansionSystem(summaries);
    expect(top?.system.code).toBe("pv");
  });
});
