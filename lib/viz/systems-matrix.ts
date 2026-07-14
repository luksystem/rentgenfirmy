import type {
  VizIntegratedSystem,
  VizProjectSystemStatus,
  VizSystemIntegrationStatus,
} from "@/lib/viz/types";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

export type SystemStatusTone = "active" | "waiting" | "critical" | "closed" | "neutral" | "blue";

export function systemStatusTone(status: VizSystemIntegrationStatus): SystemStatusTone {
  switch (status) {
    case "integrated":
      return "active";
    case "partially_integrated":
      return "blue";
    case "planned":
      return "waiting";
    case "possible":
      return "neutral";
    case "not_applicable":
      return "closed";
    default:
      return "closed";
  }
}

export function isIntegratedStatus(status: VizSystemIntegrationStatus) {
  return status === "integrated" || status === "partially_integrated";
}

export function isExpansionOpportunity(status: VizSystemIntegrationStatus) {
  return status === "planned" || status === "possible" || status === "none";
}

export function resolveSystemCellStatus(
  projectId: string,
  systemId: string,
  statuses: VizProjectSystemStatus[],
): VizSystemIntegrationStatus {
  return (
    statuses.find((item) => item.projectId === projectId && item.systemId === systemId)?.status ??
    "none"
  );
}

export type VizSystemCoverageSummary = {
  system: VizIntegratedSystem;
  integratedCount: number;
  expansionCount: number;
  storeCount: number;
  coveragePercent: number;
};

export function summarizeSystemCoverage(input: {
  systems: VizIntegratedSystem[];
  snapshots: VizStoreLiveSnapshot[];
  statuses: VizProjectSystemStatus[];
}): VizSystemCoverageSummary[] {
  const storeCount = input.snapshots.length;

  return input.systems.map((system) => {
    let integratedCount = 0;
    let expansionCount = 0;

    for (const snapshot of input.snapshots) {
      const status = resolveSystemCellStatus(snapshot.projectId, system.id, input.statuses);
      if (isIntegratedStatus(status)) {
        integratedCount += 1;
      } else if (isExpansionOpportunity(status)) {
        expansionCount += 1;
      }
    }

    return {
      system,
      integratedCount,
      expansionCount,
      storeCount,
      coveragePercent: storeCount > 0 ? Math.round((integratedCount / storeCount) * 100) : 0,
    };
  });
}

export function pickTopExpansionSystem(summaries: VizSystemCoverageSummary[]) {
  return [...summaries].sort((a, b) => b.expansionCount - a.expansionCount)[0] ?? null;
}
