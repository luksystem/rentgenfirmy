import type { ServiceCostBreakdown, ServiceLineItems, ServiceType } from "@/lib/service/types";

export const AI_WARRANTY_STATUSES = ["warranty", "paid", "mixed", "unknown"] as const;
export type AiWarrantyStatus = (typeof AI_WARRANTY_STATUSES)[number];

export type ServiceAiRecognizedTask = {
  name: string;
  category: string;
  warrantyStatus: AiWarrantyStatus;
  installerHours: number;
  helperHours: number;
  programmerOnsiteHours: number;
  programmerRemoteHours: number;
  supervisorHours: number;
  requiresTrip: boolean;
  notes: string;
};

export type ServiceAiTravelProposal = {
  estimatedTrips: number;
  oneWayDistanceKm: number;
  totalDistanceKm: number;
  estimatedDriveTimeHours: number;
  overnightRequired: boolean;
  overnights: number;
};

export type ServiceAiMaterialProposal = {
  name: string;
  estimatedNetPriceMin: number;
  estimatedNetPriceMax: number;
  confidence: number;
  verificationRequired: boolean;
  notes: string;
};

export type ServiceAiEstimateProposal = {
  confidence: number;
  summary: string;
  recognizedTasks: ServiceAiRecognizedTask[];
  travel: ServiceAiTravelProposal;
  materials: ServiceAiMaterialProposal[];
  questions: string[];
  riskFlags: string[];
};

export type ServiceAiTravelContext = {
  companyAddress: string;
  clientAddress: string;
  oneWayDistanceKm: number;
  totalDistanceKm: number;
  estimatedDriveTimeHours: number;
  resolvedOvernights: number;
  resolvedTrips: number;
  geocoded: boolean;
  geocodeNote: string | null;
};

export type ServiceAiVariance = {
  computedAt: string;
  estimateHours: {
    installer: number;
    helper: number;
    programmer: number;
    supervision: number;
    trips: number;
    accommodations: number;
  };
  actualHours: {
    installer: number;
    helper: number;
    programmer: number;
    supervision: number;
    trips: number;
    accommodations: number;
  };
  estimateNetTotal: number;
  actualNetTotal: number;
  netDelta: number;
  netDeltaPercent: number;
  summary: string;
};

export type ServiceAiEstimateRecord = {
  createdAt: string;
  description: string;
  proposal: ServiceAiEstimateProposal;
  travelContext: ServiceAiTravelContext;
  appliedAt: string | null;
  appliedLineItems: ServiceLineItems | null;
  calculatedCosts: ServiceCostBreakdown | null;
  variance: ServiceAiVariance | null;
};

export type ServiceAiEstimateRequest = {
  description: string;
  serviceType: ServiceType;
  clientId: string | null;
  clientLocation: string;
  title: string;
};
