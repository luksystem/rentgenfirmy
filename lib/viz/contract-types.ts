import type { KilometerZoneSettings, ServiceRates } from "@/lib/service/types";
import type { VizServiceContractStatus } from "@/lib/viz/types";

export type VizServiceContractRateVersion = {
  id: string;
  contractId: string;
  versionLabel: string;
  validFrom: string;
  validUntil: string | null;
  rates: ServiceRates;
  zoneSettings: KilometerZoneSettings;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VizServiceContractProjectTerm = {
  id: string;
  contractId: string;
  projectId: string;
  monthlyHoursOverride: number | null;
  contractStatusOverride: VizServiceContractStatus | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VizServiceContract = {
  id: string;
  dashboardId: string;
  name: string;
  contractType: VizServiceContractStatus;
  monthlyHoursBudget: number | null;
  slaResponseHours: number | null;
  validFrom: string | null;
  validUntil: string | null;
  notes: string | null;
  isActive: boolean;
  rateVersions: VizServiceContractRateVersion[];
  projectTerms: VizServiceContractProjectTerm[];
  createdAt: string;
  updatedAt: string;
};

export type VizServiceContractInput = {
  name: string;
  contractType?: VizServiceContractStatus;
  monthlyHoursBudget?: number | null;
  slaResponseHours?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

export type VizServiceContractRateVersionInput = {
  contractId: string;
  versionLabel: string;
  validFrom: string;
  validUntil?: string | null;
  rates: ServiceRates;
  zoneSettings: KilometerZoneSettings;
  notes?: string | null;
};

export type VizProjectHoursSummary = {
  projectId: string;
  projectLabel: string;
  totalMinutes: number;
  billableMinutes: number;
  totalHours: number;
  billableHours: number;
};

export type VizDashboardHoursSummary = {
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  billableHours: number;
  projects: VizProjectHoursSummary[];
};

export type VizTravelCalcInput = {
  projectId: string;
  tripCount?: number;
  carHours?: number;
  label?: string | null;
};

export type VizTravelCalcResult = {
  projectId: string;
  projectLabel: string;
  companyAddress: string;
  clientAddress: string;
  oneWayKm: number;
  tripCount: number;
  zone: 0 | 1 | 2 | 3;
  suggestedCarHoursPerTrip: number;
  carKmCost: number;
  carHoursCost: number;
  totalTravelCost: number;
  rates: ServiceRates;
  zoneSettings: KilometerZoneSettings;
  geocodeNote: string | null;
};

export type VizTravelCalcSnapshot = VizTravelCalcResult & {
  id: string;
  dashboardId: string;
  label: string | null;
  createdByName: string;
  createdAt: string;
};
