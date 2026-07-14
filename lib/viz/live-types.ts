import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

export type VizDashboardLiveKpi = {
  storeCount: number;
  onlineCount: number;
  offlineCount: number;
  alarmCount: number;
  openServiceRequests: number;
  avgTemperature: number | null;
  storesWithEnergyReading: number;
  totalEnergyKwh: number | null;
  avgEnergyKwh: number | null;
  energyInvoiceCount: number;
};

export type VizDashboardLiveResponse = {
  snapshots: VizStoreLiveSnapshot[];
  kpi: VizDashboardLiveKpi;
};

export function averageSetpointFromSnapshots(snapshots: VizStoreLiveSnapshot[]) {
  const values = snapshots
    .map((store) => store.roles.store_setpoint?.numericValue)
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

  if (!values.length) {
    return null;
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
