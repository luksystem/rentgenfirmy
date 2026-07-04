import { generateServiceAiEstimate } from "@/lib/ai/service-estimate-generator";
import { buildReferenceCasesFromServices } from "@/lib/service/ai-reference-cases";
import type { ServiceAiEstimateRecord } from "@/lib/service/ai-estimate-types";
import { aggregateAiTaskHours, buildLineItemsFromAiEstimate } from "@/lib/service/apply-ai-estimate";
import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import {
  resolveIntakeEstimateScope,
  type IntakeEstimateScope,
} from "@/lib/service-intake/ai-estimate-flow";
import type { ServiceIntakePostWarrantyAction } from "@/lib/service-intake/types";
import {
  fetchProjectAiContext,
  formatProjectAiContextForPrompt,
} from "@/lib/service/project-ai-context";
import { buildServiceTravelContext } from "@/lib/service/travel-context";
import type { ServiceAiWarrantyContext } from "@/lib/project/warranty";
import type {
  ServiceCostBreakdown,
  ServiceDiscounts,
  ServiceLineItems,
  ServiceRates,
  ServiceType,
  KilometerZoneSettings,
  Client,
} from "@/lib/service/types";
import { applyRateSurchargePercent } from "@/lib/service/rate-surcharge";
import { rowToService } from "@/lib/supabase/service-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const INTAKE_ESTIMATE_DISCLAIMER =
  "Orientacyjna wycena — ostateczna kwota może się zmienić po doprecyzowaniu wymagań i weryfikacji na miejscu.";

export type IntakeSuggestedWorkMode = "on_site" | "remote" | "mixed";

export type IntakeAiEstimatePublic = {
  confidence: number;
  summary: string;
  disclaimer: string;
  estimateScope: IntakeEstimateScope;
  suggestedWorkMode: IntakeSuggestedWorkMode;
  recommendedPostWarrantyAction: ServiceIntakePostWarrantyAction | null;
  actionRecommendationNote: string | null;
  remoteOnlyViable: boolean | null;
  onsiteVisitLikelyRequired: boolean | null;
  hours: {
    installer: number;
    helper: number;
    programmerOnsite: number;
    programmerRemote: number;
    supervision: number;
    totalLabor: number;
  };
  travel: {
    oneWayDistanceKm: number;
    trips: number;
    overnights: number;
    driveTimeHours: number;
  };
  estimatedNetTotal: number;
  estimatedNetTotalBeforeSurcharge: number | null;
  prioritySurchargeApplied: boolean;
  prioritySurchargePercent: number | null;
  materialsNetEstimate: number | null;
  questions: string[];
  riskFlags: string[];
};

export type IntakeAiEstimateResult = {
  public: IntakeAiEstimatePublic;
  record: ServiceAiEstimateRecord;
  lineItems: ServiceLineItems;
  costBreakdown: ServiceCostBreakdown;
};

function resolveSuggestedWorkMode(hours: ReturnType<typeof aggregateAiTaskHours>): IntakeSuggestedWorkMode {
  const onsite =
    hours.installerHours +
    hours.helperHours +
    hours.programmerOnsiteHours +
    hours.supervisorHours;
  const remote = hours.programmerRemoteHours;

  if (remote <= 0 && onsite > 0) {
    return "on_site";
  }
  if (onsite <= 0 && remote > 0) {
    return "remote";
  }
  if (remote >= onsite) {
    return "mixed";
  }
  return onsite >= remote * 2 ? "on_site" : "mixed";
}

export function applyEstimateScopeToLineItems(
  lineItems: ServiceLineItems,
  scope: IntakeEstimateScope,
  remoteProgrammerHours: number,
): ServiceLineItems {
  if (scope !== "remote_only") {
    return lineItems;
  }

  return {
    ...lineItems,
    installerHours: 0,
    helperHours: 0,
    programmerHours: Math.round(remoteProgrammerHours * 10) / 10,
    supervisionHours: 0,
    tripCount: 0,
    accommodations: 0,
    carHours: 0,
    materialsCost: 0,
    billable: {
      ...lineItems.billable,
      installerHours: false,
      helperHours: false,
      programmerHours: remoteProgrammerHours > 0,
      supervisionHours: false,
      carKilometers: false,
      carHours: false,
      accommodations: false,
      materials: false,
    },
  };
}

export async function computeIntakeAiEstimate(input: {
  description: string;
  serviceType: ServiceType;
  client: Client;
  projectId: string;
  projectName: string;
  warrantyContext: ServiceAiWarrantyContext | null;
  companyAddress: string;
  rates: ServiceRates;
  zoneSettings: KilometerZoneSettings;
  discounts: ServiceDiscounts;
  prioritySurchargePercent?: number;
  applyPrioritySurcharge?: boolean;
  postWarrantyAction?: ServiceIntakePostWarrantyAction | null;
}): Promise<IntakeAiEstimateResult> {
  const supabase = getSupabaseAdmin();
  const [{ data: settledRows }, projectContextData] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("status", "Rozliczony")
      .order("updated_at", { ascending: false })
      .limit(10),
    fetchProjectAiContext({
      projectId: input.projectId,
      projectName: input.projectName,
    }),
  ]);

  const referenceCases = buildReferenceCasesFromServices(
    (settledRows ?? []).map(rowToService),
  );

  const projectContext = projectContextData
    ? formatProjectAiContextForPrompt(projectContextData)
    : null;

  const estimateScope = resolveIntakeEstimateScope(input.postWarrantyAction ?? null);

  const proposal = await generateServiceAiEstimate({
    description: input.description,
    serviceType: input.serviceType,
    clientLocation: input.client.location,
    companyAddress: input.companyAddress,
    oneWayDistanceKm: null,
    referenceCases,
    projectContext,
    warrantyContext: input.warrantyContext,
    postWarrantyAction: input.postWarrantyAction ?? null,
  });

  const hours = aggregateAiTaskHours(proposal.recognizedTasks);
  const totalOnsiteHours =
    estimateScope === "remote_only"
      ? 0
      : hours.installerHours +
        hours.helperHours +
        hours.programmerOnsiteHours +
        hours.supervisorHours;

  const travelContext = await buildServiceTravelContext({
    companyAddress: input.companyAddress,
    client: input.client,
    clientLocationFallback: input.client.location,
    zoneSettings: input.zoneSettings,
    aiTravel:
      estimateScope === "remote_only"
        ? {
            ...proposal.travel,
            estimatedTrips: 0,
            overnights: 0,
            overnightRequired: false,
            estimatedDriveTimeHours: 0,
            totalDistanceKm: 0,
          }
        : proposal.travel,
    totalOnsiteHours,
  });

  proposal.travel = {
    ...proposal.travel,
    oneWayDistanceKm: travelContext.oneWayDistanceKm,
    totalDistanceKm: travelContext.totalDistanceKm,
    estimatedDriveTimeHours: travelContext.estimatedDriveTimeHours,
    overnights: travelContext.resolvedOvernights,
    overnightRequired: travelContext.resolvedOvernights > 0,
    estimatedTrips: travelContext.resolvedTrips,
  };

  const lineItems = applyEstimateScopeToLineItems(
    buildLineItemsFromAiEstimate({
      proposal,
      travelContext:
        estimateScope === "remote_only"
          ? {
              ...travelContext,
              resolvedTrips: 0,
              resolvedOvernights: 0,
              estimatedDriveTimeHours: 0,
            }
          : travelContext,
    }),
    estimateScope,
    hours.programmerRemoteHours,
  );

  const surchargePercent =
    input.applyPrioritySurcharge && (input.prioritySurchargePercent ?? 0) > 0
      ? input.prioritySurchargePercent!
      : 0;
  const billingRates =
    surchargePercent > 0
      ? applyRateSurchargePercent(input.rates, surchargePercent)
      : input.rates;

  const costBreakdown = calculateServiceCost(
    lineItems,
    billingRates,
    input.zoneSettings,
    input.discounts,
  );

  const costBreakdownBase =
    surchargePercent > 0
      ? calculateServiceCost(lineItems, input.rates, input.zoneSettings, input.discounts)
      : null;

  const now = new Date().toISOString();
  const record: ServiceAiEstimateRecord = {
    createdAt: now,
    description: input.description.trim(),
    proposal,
    travelContext,
    appliedAt: null,
    appliedLineItems: null,
    calculatedCosts: costBreakdown,
    variance: null,
  };

  const materialsNetEstimate =
    lineItems.materialsCost > 0 ? lineItems.materialsCost : null;

  const intakeRecommendation = proposal.intakeRecommendation;

  const publicView: IntakeAiEstimatePublic = {
    confidence: proposal.confidence,
    summary: proposal.summary,
    disclaimer:
      estimateScope === "remote_only"
        ? "Orientacyjna wycena pracy zdalnej — dojazd i prace na miejscu nie są wliczone. Ostateczna kwota może się zmienić po weryfikacji."
        : INTAKE_ESTIMATE_DISCLAIMER,
    estimateScope,
    suggestedWorkMode: resolveSuggestedWorkMode(hours),
    recommendedPostWarrantyAction: intakeRecommendation?.recommendedAction ?? null,
    actionRecommendationNote: intakeRecommendation?.note ?? null,
    remoteOnlyViable: intakeRecommendation?.remoteOnlyViable ?? null,
    onsiteVisitLikelyRequired: intakeRecommendation?.onsiteVisitLikelyRequired ?? null,
    hours: {
      installer: hours.installerHours,
      helper: hours.helperHours,
      programmerOnsite: hours.programmerOnsiteHours,
      programmerRemote: hours.programmerRemoteHours,
      supervision: hours.supervisorHours,
      totalLabor:
        hours.installerHours +
        hours.helperHours +
        hours.programmerOnsiteHours +
        hours.programmerRemoteHours +
        hours.supervisorHours,
    },
    travel: {
      oneWayDistanceKm: travelContext.oneWayDistanceKm,
      trips: estimateScope === "remote_only" ? 0 : travelContext.resolvedTrips,
      overnights: estimateScope === "remote_only" ? 0 : travelContext.resolvedOvernights,
      driveTimeHours:
        estimateScope === "remote_only" ? 0 : travelContext.estimatedDriveTimeHours,
    },
    estimatedNetTotal: costBreakdown.netTotal,
    estimatedNetTotalBeforeSurcharge: costBreakdownBase?.netTotal ?? null,
    prioritySurchargeApplied: surchargePercent > 0,
    prioritySurchargePercent: surchargePercent > 0 ? surchargePercent : null,
    materialsNetEstimate: estimateScope === "remote_only" ? null : materialsNetEstimate,
    questions: proposal.questions,
    riskFlags: proposal.riskFlags,
  };

  return { public: publicView, record, lineItems, costBreakdown };
}
