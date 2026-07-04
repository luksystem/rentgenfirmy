import type { ServiceRates } from "@/lib/service/types";

function roundRate(value: number) {
  return Math.round(value * 100) / 100;
}

export function applyRateSurchargePercent(rates: ServiceRates, surchargePercent: number): ServiceRates {
  if (!Number.isFinite(surchargePercent) || surchargePercent <= 0) {
    return rates;
  }

  const factor = 1 + surchargePercent / 100;

  return {
    supervisionHourly: roundRate(rates.supervisionHourly * factor),
    installerHourly: roundRate(rates.installerHourly * factor),
    helperHourly: roundRate(rates.helperHourly * factor),
    programmerHourly: roundRate(rates.programmerHourly * factor),
    carPerKm: roundRate(rates.carPerKm * factor),
    carHourly: roundRate(rates.carHourly * factor),
    accommodationCost: roundRate(rates.accommodationCost * factor),
  };
}
