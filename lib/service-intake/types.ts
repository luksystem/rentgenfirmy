export const SERVICE_INTAKE_STATUSES = [
  "new",
  "in_review",
  "converted",
  "closed",
  "rejected",
] as const;

export type ServiceIntakeStatus = (typeof SERVICE_INTAKE_STATUSES)[number];

/** System priorytetów CAFE: Critical, Asap, Freetime, Easy */
export const SERVICE_INTAKE_PRIORITIES = ["c", "a", "f", "e"] as const;

export type ServiceIntakePriority = (typeof SERVICE_INTAKE_PRIORITIES)[number];

export const SERVICE_INTAKE_REQUEST_TYPES = ["service", "new_feature", "offer_request"] as const;

export type ServiceIntakeRequestType = (typeof SERVICE_INTAKE_REQUEST_TYPES)[number];

export const SERVICE_INTAKE_POST_WARRANTY_ACTIONS = ["offer", "on_site", "remote"] as const;

export type ServiceIntakePostWarrantyAction = (typeof SERVICE_INTAKE_POST_WARRANTY_ACTIONS)[number];

export const SERVICE_INTAKE_STATUS_LABELS: Record<ServiceIntakeStatus, string> = {
  new: "Nowe",
  in_review: "W trakcie",
  converted: "Przekształcone",
  closed: "Zamknięte",
  rejected: "Odrzucone",
};

export const SERVICE_INTAKE_PRIORITY_LABELS: Record<ServiceIntakePriority, string> = {
  c: "C — Krytyczny",
  a: "A — Asap",
  f: "F — Freetime",
  e: "E — Easy",
};

export const SERVICE_INTAKE_REQUEST_TYPE_LABELS: Record<ServiceIntakeRequestType, string> = {
  service: "Zgłoszenie serwisowe",
  new_feature: "Nowa funkcjonalność",
  offer_request: "Prośba o ofertę",
};

export const SERVICE_INTAKE_POST_WARRANTY_ACTION_LABELS: Record<
  ServiceIntakePostWarrantyAction,
  string
> = {
  offer: "Przygotowanie oferty",
  on_site: "Przyjazd serwisanta",
  remote: "Serwis zdalny",
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
  requestType: ServiceIntakeRequestType;
  priority: ServiceIntakePriority | null;
  postWarrantyAction: ServiceIntakePostWarrantyAction | null;
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
