import type { ServiceAiEstimateRecord } from "@/lib/service/ai-estimate-types";
import type { IntakeAiEstimatePublic } from "@/lib/service-intake/intake-ai-estimate";
import type { ServiceType } from "@/lib/service/types";

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

export const SERVICE_INTAKE_WORK_PREFERENCES = ["on_site", "remote", "either"] as const;

export type ServiceIntakeWorkPreference = (typeof SERVICE_INTAKE_WORK_PREFERENCES)[number];

export const SERVICE_INTAKE_WORK_PREFERENCE_LABELS: Record<ServiceIntakeWorkPreference, string> = {
  on_site: "Praca u mnie w obiekcie",
  remote: "Praca zdalna (zdalny dostęp)",
  either: "Do ustalenia — obie opcje są możliwe",
};

export const SERVICE_INTAKE_STATUS_LABELS: Record<ServiceIntakeStatus, string> = {
  new: "Nowe",
  in_review: "W trakcie",
  converted: "Rozliczanie",
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
  closedAt: string | null;
  dueAt: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  aiEstimate: ServiceIntakeAiEstimateSnapshot | null;
  workPreference: ServiceIntakeWorkPreference | null;
  preliminaryAcceptedAt: string | null;
  clientName?: string | null;
  projectName?: string | null;
};

export type ServiceIntakeAiEstimateSnapshot = {
  public: IntakeAiEstimatePublic;
  record: ServiceAiEstimateRecord;
  serviceType: ServiceType;
};

export type ServiceIntakeAttachment = {
  id: string;
  intakeId: string;
  kind: "image" | "video" | "link";
  url: string;
  label: string | null;
  createdAt: string;
};

export type ServiceIntakeComment = {
  id: string;
  intakeId: string;
  authorName: string;
  authorSide: "client" | "team";
  body: string;
  createdAt: string;
};

export type ServiceIntakeThread = {
  intake: ServiceIntakeRecord;
  attachments: ServiceIntakeAttachment[];
  comments: ServiceIntakeComment[];
};
