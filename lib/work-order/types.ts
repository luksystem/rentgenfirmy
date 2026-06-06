import type { ServiceClient, ServiceType } from "@/lib/service/types";
import type { ClientOfferAcceptedDocument } from "@/lib/service/client-offer-snapshot";

export const WORK_ORDER_SOURCES = ["accepted_offer", "manual"] as const;
export type WorkOrderSource = (typeof WORK_ORDER_SOURCES)[number];

export const WORK_ORDER_STATUSES = [
  "Nowe",
  "Zaplanowane",
  "W trakcie",
  "Zrealizowane",
  "Anulowane",
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_SOURCE_LABELS: Record<WorkOrderSource, string> = {
  accepted_offer: "Z oferty",
  manual: "Ręcznie",
};

export type WorkOrderRecord = {
  id: string;
  source: WorkOrderSource;
  serviceId: string | null;
  projectId: string | null;
  clientId: string | null;
  status: WorkOrderStatus;
  title: string;
  serviceType: ServiceType;
  client: ServiceClient;
  notes: string;
  acceptedAt: string | null;
  offerGrossTotal: number | null;
  acceptedOfferDocument: ClientOfferAcceptedDocument | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkOrderInput = Omit<WorkOrderRecord, "id" | "createdAt" | "updatedAt">;
