export const SERVICE_INTAKE_STATUSES = [
  "new",
  "in_review",
  "converted",
  "closed",
  "rejected",
] as const;

export type ServiceIntakeStatus = (typeof SERVICE_INTAKE_STATUSES)[number];

export const SERVICE_INTAKE_PRIORITIES = ["low", "standard", "urgent"] as const;

export type ServiceIntakePriority = (typeof SERVICE_INTAKE_PRIORITIES)[number];

export const SERVICE_INTAKE_STATUS_LABELS: Record<ServiceIntakeStatus, string> = {
  new: "Nowe",
  in_review: "W trakcie",
  converted: "Przekształcone",
  closed: "Zamknięte",
  rejected: "Odrzucone",
};

export const SERVICE_INTAKE_PRIORITY_LABELS: Record<ServiceIntakePriority, string> = {
  low: "Niski",
  standard: "Standardowy",
  urgent: "Pilny",
};

export type ServiceIntakeProjectOption = {
  id: string;
  name: string;
  location: string | null;
  warrantyStatus: string;
  warrantyLabel: string;
  warrantyTone: "neutral" | "success" | "warning" | "danger";
  warrantyEndsAt: string | null;
  isWarrantyActive: boolean;
};

export type ServiceIntakeVerifyResult = {
  verificationToken: string;
  clientDisplayName: string;
  projects: ServiceIntakeProjectOption[];
  rates: {
    supervisionHourly: number;
    installerHourly: number;
    programmerHourly: number;
    carPerKm: number;
    carHourly: number;
    vatRate: number;
  };
};

export type ServiceIntakeRecord = {
  id: string;
  referenceNumber: string;
  status: ServiceIntakeStatus;
  clientId: string | null;
  projectId: string | null;
  serviceId: string | null;
  contactEmail: string;
  contactFullName: string;
  contactPhone: string | null;
  warrantyStatus: string | null;
  serviceTypeHint: "Gwarancyjny" | "Pogwarancyjny";
  priority: ServiceIntakePriority;
  description: string;
  acceptedPaidTerms: boolean;
  acceptedPaidTermsAt: string | null;
  trackingToken: string;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  clientName?: string | null;
  projectName?: string | null;
};
