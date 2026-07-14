import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

export type VizEnergyKpi = {
  storesWithEnergyReading: number;
  totalEnergyKwh: number | null;
  avgEnergyKwh: number | null;
  invoiceCount: number;
};

export function aggregateEnergyFromSnapshots(
  snapshots: VizStoreLiveSnapshot[],
): Pick<VizEnergyKpi, "storesWithEnergyReading" | "totalEnergyKwh" | "avgEnergyKwh"> {
  const energyValues = snapshots
    .map((snapshot) => {
      const fromTotal = snapshot.roles.energy_total?.numericValue;
      if (fromTotal != null) {
        return fromTotal;
      }
      return snapshot.roles.energy_current_period?.numericValue ?? null;
    })
    .filter((value): value is number => value != null && !Number.isNaN(value));

  if (!energyValues.length) {
    return {
      storesWithEnergyReading: 0,
      totalEnergyKwh: null,
      avgEnergyKwh: null,
    };
  }

  const totalEnergyKwh = energyValues.reduce((sum, value) => sum + value, 0);
  return {
    storesWithEnergyReading: energyValues.length,
    totalEnergyKwh,
    avgEnergyKwh: totalEnergyKwh / energyValues.length,
  };
}

export function formatEnergyKwh(value: number | null) {
  if (value == null) {
    return "—";
  }
  return `${value.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} kWh`;
}
