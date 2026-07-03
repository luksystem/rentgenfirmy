import type {
  ServiceAiEstimateProposal,
  ServiceAiRecognizedTask,
} from "@/lib/service/ai-estimate-types";
import type { ServiceLineItems } from "@/lib/service/types";
import { emptyLineItems } from "@/lib/service/types";

function roundHours(value: number) {
  return Math.round(value * 10) / 10;
}

export function aggregateAiTaskHours(tasks: ServiceAiRecognizedTask[]) {
  return tasks.reduce(
    (acc, task) => ({
      installerHours: acc.installerHours + task.installerHours,
      helperHours: acc.helperHours + task.helperHours,
      programmerOnsiteHours: acc.programmerOnsiteHours + task.programmerOnsiteHours,
      programmerRemoteHours: acc.programmerRemoteHours + task.programmerRemoteHours,
      supervisorHours: acc.supervisorHours + task.supervisorHours,
    }),
    {
      installerHours: 0,
      helperHours: 0,
      programmerOnsiteHours: 0,
      programmerRemoteHours: 0,
      supervisorHours: 0,
    },
  );
}

export function buildMaterialsNote(materials: ServiceAiEstimateProposal["materials"]) {
  if (!materials.length) {
    return "";
  }

  return materials
    .map((item) => {
      const range =
        item.estimatedNetPriceMin > 0 || item.estimatedNetPriceMax > 0
          ? ` (${item.estimatedNetPriceMin}–${item.estimatedNetPriceMax} zł netto, orientacyjnie)`
          : "";
      const flag = item.verificationRequired ? " — do weryfikacji" : "";
      return `${item.name}${range}${flag}. ${item.notes}`.trim();
    })
    .join("\n");
}

export function estimateMaterialsNetMidpoint(materials: ServiceAiEstimateProposal["materials"]) {
  const verified = materials.filter((item) => item.verificationRequired);
  const source = verified.length ? verified : materials;
  if (!source.length) {
    return 0;
  }

  const total = source.reduce(
    (sum, item) => sum + (item.estimatedNetPriceMin + item.estimatedNetPriceMax) / 2,
    0,
  );
  return Math.round(total);
}

export function buildLineItemsFromAiEstimate(input: {
  proposal: ServiceAiEstimateProposal;
  travelContext: {
    oneWayDistanceKm: number;
    resolvedTrips: number;
    resolvedOvernights: number;
    estimatedDriveTimeHours: number;
  };
  existing?: ServiceLineItems;
}): ServiceLineItems {
  const base = input.existing ?? emptyLineItems();
  const hours = aggregateAiTaskHours(input.proposal.recognizedTasks);
  const programmerHours = roundHours(
    hours.programmerOnsiteHours + hours.programmerRemoteHours,
  );

  const remoteNote =
    hours.programmerRemoteHours > 0
      ? `Programista zdalnie: ${hours.programmerRemoteHours} h. `
      : "";

  const aiSummary = [
    input.proposal.summary,
    input.proposal.riskFlags.length
      ? `Ryzyka: ${input.proposal.riskFlags.join("; ")}`
      : null,
    input.proposal.questions.length
      ? `Do doprecyzowania: ${input.proposal.questions.join(" | ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const materialsNote = [buildMaterialsNote(input.proposal.materials), base.materialsNote]
    .filter(Boolean)
    .join("\n\n");

  return {
    ...base,
    installerHours: roundHours(hours.installerHours),
    helperHours: roundHours(hours.helperHours),
    programmerHours,
    supervisionHours: roundHours(hours.supervisorHours),
    tripCount: input.travelContext.resolvedTrips,
    kilometersOneWay: input.travelContext.oneWayDistanceKm,
    accommodations: input.travelContext.resolvedOvernights,
    carHours: roundHours(input.travelContext.estimatedDriveTimeHours),
    materialsCost: estimateMaterialsNetMidpoint(input.proposal.materials),
    materialsNote,
    workReportNote: [remoteNote + aiSummary, base.workReportNote].filter(Boolean).join("\n\n"),
    billable: {
      ...base.billable,
      installerHours: hours.installerHours > 0 || base.billable.installerHours,
      helperHours: hours.helperHours > 0 || base.billable.helperHours,
      programmerHours: programmerHours > 0 || base.billable.programmerHours,
      supervisionHours: hours.supervisorHours > 0 || base.billable.supervisionHours,
      carKilometers:
        input.travelContext.oneWayDistanceKm > 0 || base.billable.carKilometers,
      carHours:
        input.travelContext.estimatedDriveTimeHours > 0 || base.billable.carHours,
      accommodations:
        input.travelContext.resolvedOvernights > 0 || base.billable.accommodations,
      materials:
        estimateMaterialsNetMidpoint(input.proposal.materials) > 0 || base.billable.materials,
    },
  };
}

export function buildAiEstimateTitleHint(proposal: ServiceAiEstimateProposal) {
  const names = proposal.recognizedTasks.map((task) => task.name).slice(0, 3);
  return names.join(", ");
}
