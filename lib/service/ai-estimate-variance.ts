import type { ServiceAiVariance } from "@/lib/service/ai-estimate-types";
import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import type {
  ServiceDiscounts,
  ServiceLineItems,
  ServiceRates,
  KilometerZoneSettings,
} from "@/lib/service/types";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeAiEstimateVariance(input: {
  estimateLineItems: ServiceLineItems;
  actualLineItems: ServiceLineItems;
  rates: ServiceRates;
  zoneSettings: KilometerZoneSettings;
  estimateDiscounts: ServiceDiscounts;
  actualDiscounts: ServiceDiscounts;
}): ServiceAiVariance {
  const estimateCost = calculateServiceCost(
    input.estimateLineItems,
    input.rates,
    input.zoneSettings,
    input.estimateDiscounts,
  );
  const actualCost = calculateServiceCost(
    input.actualLineItems,
    input.rates,
    input.zoneSettings,
    input.actualDiscounts,
  );

  const estimateHours = {
    installer: input.estimateLineItems.installerHours,
    helper: input.estimateLineItems.helperHours,
    programmer: input.estimateLineItems.programmerHours,
    supervision: input.estimateLineItems.supervisionHours,
    trips: input.estimateLineItems.tripCount,
    accommodations: input.estimateLineItems.accommodations,
  };

  const actualHours = {
    installer: input.actualLineItems.installerHours,
    helper: input.actualLineItems.helperHours,
    programmer: input.actualLineItems.programmerHours,
    supervision: input.actualLineItems.supervisionHours,
    trips: input.actualLineItems.tripCount,
    accommodations: input.actualLineItems.accommodations,
  };

  const netDelta = roundMoney(actualCost.netTotal - estimateCost.netTotal);
  const netDeltaPercent =
    estimateCost.netTotal > 0
      ? roundMoney((netDelta / estimateCost.netTotal) * 100)
      : 0;

  const hourLines = (
    [
      ["instalator", estimateHours.installer, actualHours.installer],
      ["pomocnik", estimateHours.helper, actualHours.helper],
      ["programista", estimateHours.programmer, actualHours.programmer],
      ["nadzór", estimateHours.supervision, actualHours.supervision],
    ] as const
  )
    .map(([label, estimate, actual]) => {
      const delta = roundHoursDelta(actual - estimate);
      return delta !== 0 ? `${label}: ${formatDelta(delta)} h` : null;
    })
    .filter(Boolean);

  const summaryParts = [
    `Różnica netto: ${netDelta >= 0 ? "+" : ""}${netDelta} zł (${netDeltaPercent >= 0 ? "+" : ""}${netDeltaPercent}%).`,
    hourLines.length ? `Godziny: ${hourLines.join(", ")}.` : null,
  ].filter(Boolean);

  return {
    computedAt: new Date().toISOString(),
    estimateHours,
    actualHours,
    estimateNetTotal: estimateCost.netTotal,
    actualNetTotal: actualCost.netTotal,
    netDelta,
    netDeltaPercent,
    summary: summaryParts.join(" "),
  };
}

function roundHoursDelta(value: number) {
  return Math.round(value * 10) / 10;
}

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}
